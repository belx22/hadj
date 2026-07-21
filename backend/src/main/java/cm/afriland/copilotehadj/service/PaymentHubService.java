package cm.afriland.copilotehadj.service;

import cm.afriland.copilotehadj.web.ApiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Intégration Payment Hub (pay.bbcomplex.com). Les appels sont serveur→serveur :
 * la clé d'API et le secret ne quittent jamais le backend. Voir le guide
 * d'intégration : POST /payments (créer), GET /payments/{id} (source de vérité),
 * GET /methods (moyens activés), et vérification HMAC-SHA256 des notifications.
 */
@Service
public class PaymentHubService {

    private static final Logger log = LoggerFactory.getLogger(PaymentHubService.class);

    private final boolean enabled;
    private final String apiKey;
    private final String secret;
    private final String currency;
    private final RestClient client;

    public PaymentHubService(
            @Value("${copilote.payment-hub.enabled:false}") boolean enabled,
            @Value("${copilote.payment-hub.base-url:https://pay.bbcomplex.com}") String baseUrl,
            @Value("${copilote.payment-hub.api-key:}") String apiKey,
            @Value("${copilote.payment-hub.secret:}") String secret,
            @Value("${copilote.payment-hub.currency:XAF}") String currency) {
        this.enabled = enabled;
        this.apiKey = apiKey;
        this.secret = secret;
        this.currency = currency;
        this.client = RestClient.builder().baseUrl(baseUrl).build();
    }

    /** Le paiement en ligne n'est proposé que si le Hub est activé ET configuré. */
    public boolean isEnabled() {
        return enabled && apiKey != null && !apiKey.isBlank();
    }

    public String currency() {
        return currency;
    }

    private void ensureReady() {
        if (!isEnabled()) throw new ApiException(503, "PAYMENT_HUB_DISABLED");
    }

    /**
     * Crée un paiement. {@code reference} est notre identifiant de rapprochement
     * (renvoyé tel quel), {@code idempotencyKey} évite un double encaissement si
     * l'appel est rejoué. Renvoie la réponse du Hub (id, checkoutUrl, status…).
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> createPayment(String reference, long amount, String payerName,
                                             String idempotencyKey, Map<String, Object> metadata) {
        ensureReady();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("reference", reference);
        body.put("amount", amount);
        body.put("currency", currency);
        if (payerName != null) body.put("payerName", payerName);
        if (metadata != null) body.put("metadata", metadata);
        try {
            return client.post()
                    .uri("/api/v1/payments")
                    .header("X-Api-Key", apiKey)
                    .header("X-Idempotency-Key", idempotencyKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(Map.class);
        } catch (Exception e) {
            log.warn("Payment Hub createPayment a échoué : {}", e.getMessage());
            throw new ApiException(502, "PAYMENT_HUB_UNAVAILABLE");
        }
    }

    /** Source de vérité : à reconfirmer avant de livrer le service. */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getPayment(String id) {
        ensureReady();
        try {
            return client.get()
                    .uri("/api/v1/payments/{id}", id)
                    .header("X-Api-Key", apiKey)
                    .retrieve()
                    .body(Map.class);
        } catch (Exception e) {
            log.warn("Payment Hub getPayment a échoué : {}", e.getMessage());
            throw new ApiException(502, "PAYMENT_HUB_UNAVAILABLE");
        }
    }

    /** Moyens activés pour l'application, pour aligner l'interface. */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getMethods() {
        if (!isEnabled()) return List.of();
        try {
            return client.get()
                    .uri("/api/v1/methods")
                    .header("X-Api-Key", apiKey)
                    .retrieve()
                    .body(List.class);
        } catch (Exception e) {
            log.warn("Payment Hub getMethods a échoué : {}", e.getMessage());
            return List.of();
        }
    }

    /**
     * Vérifie la signature d'une notification. Le HMAC-SHA256 est calculé sur le
     * corps BRUT (avant tout traitement JSON), clé = notre secret. En-tête
     * attendu : {@code sha256=<hex>}. Comparaison à temps constant.
     */
    public boolean verifySignature(String rawBody, String signatureHeader) {
        if (secret == null || secret.isBlank() || signatureHeader == null || rawBody == null) return false;
        String expected = "sha256=" + hmacSha256Hex(secret, rawBody);
        byte[] a = expected.getBytes(StandardCharsets.UTF_8);
        byte[] b = signatureHeader.getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(a, b);
    }

    private static String hmacSha256Hex(String key, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] raw = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(raw.length * 2);
            for (byte x : raw) sb.append(Character.forDigit((x >> 4) & 0xF, 16)).append(Character.forDigit(x & 0xF, 16));
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException("HMAC-SHA256 indisponible", e);
        }
    }
}
