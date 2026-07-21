package cm.afriland.copilotehadj.controller;

import cm.afriland.copilotehadj.service.AuditService;
import cm.afriland.copilotehadj.service.VersementService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/versements")
public class VersementController {

    private final VersementService service;
    private final AuditService audit;

    public VersementController(VersementService service, AuditService audit) {
        this.service = service;
        this.audit = audit;
    }

    @PostMapping
    public Map<String, Object> create(@RequestBody Map<String, Object> body) {
        return service.createOnline((String) body.get("idNumber"), (String) body.get("phone"), body);
    }

    @PostMapping("/groupe")
    public Map<String, Object> createGrouped(@RequestBody Map<String, Object> body) {
        return service.createGrouped((String) body.get("payerIdNumber"), (String) body.get("payerPhone"), body);
    }

    @GetMapping("/beneficiaire/{idNumber}")
    public Map<String, Object> lookup(@PathVariable String idNumber, @RequestParam(required = false) Integer season) {
        return service.lookupBeneficiary(idNumber, season);
    }

    @GetMapping("/en-attente")
    public List<Map<String, Object>> pending() {
        return service.pending();
    }

    @GetMapping("/historique")
    public List<Map<String, Object>> history(@RequestParam Map<String, String> filters) {
        return service.history(filters);
    }

    @GetMapping("/groupes")
    public List<Map<String, Object>> grouped() {
        return service.groupedPayments();
    }

    @GetMapping("/remboursements")
    public List<Map<String, Object>> refunds() {
        return service.refunds();
    }

    @PutMapping("/{versementId}/valider")
    public Map<String, Object> validate(@PathVariable String versementId, @RequestBody Map<String, Object> body) {
        return service.validate((String) body.get("bordereauId"), versementId, audit.currentUser());
    }

    @PutMapping("/valider-en-masse")
    @SuppressWarnings("unchecked")
    public Map<String, Object> bulkValidate(@RequestBody Map<String, Object> body) {
        return service.bulkValidate((List<Map<String, Object>>) body.get("items"), audit.currentUser());
    }

    @PutMapping("/{versementId}/rejeter")
    public Map<String, Object> reject(@PathVariable String versementId, @RequestBody Map<String, Object> body) {
        return service.reject((String) body.get("bordereauId"), versementId, (String) body.get("reason"), audit.currentUser());
    }

    @PutMapping("/{versementId}/rembourser")
    public Map<String, Object> refund(@PathVariable String versementId, @RequestBody Map<String, Object> body) {
        return service.processRefund((String) body.get("bordereauId"), versementId, body, audit.currentUser());
    }

    @PostMapping("/import-statuts")
    @SuppressWarnings("unchecked")
    public Map<String, Object> importStatuses(@RequestBody Map<String, Object> body) {
        return service.importStatusesByReference((List<Map<String, Object>>) body.get("rows"), audit.currentUser());
    }

    // Rapprochement bancaire (fichier BI) : validation par référence + contrôle du montant.
    @PostMapping("/rapprochement")
    @SuppressWarnings("unchecked")
    public Map<String, Object> reconcile(@RequestBody Map<String, Object> body) {
        return service.reconcile((List<Map<String, Object>>) body.get("rows"), audit.currentUser());
    }

    // --- Paiement en ligne (Payment Hub) — endpoints publics (self-service pèlerin) ---

    // Disponibilité + moyens activés, pour aligner l'interface.
    @GetMapping("/paiement-en-ligne/config")
    public Map<String, Object> onlinePaymentConfig() {
        return Map.of("enabled", service.onlinePaymentEnabled(),
                "methods", service.onlinePaymentMethods());
    }

    // Initie le paiement du solde restant : renvoie l'adresse de règlement (checkoutUrl).
    @PostMapping("/paiement-en-ligne")
    public Map<String, Object> createOnlinePayment(@RequestBody Map<String, String> body) {
        return service.createOnlinePayment(body.get("idNumber"), body.get("phone"));
    }

    // Reconfirmation (source de vérité) : à appeler au retour de la page de paiement.
    @GetMapping("/paiement-en-ligne/{paymentId}/statut")
    public Map<String, Object> confirmOnlinePayment(@PathVariable String paymentId) {
        return service.confirmOnlinePayment(paymentId);
    }

    // Notification signée du Hub : le corps BRUT est requis pour vérifier le HMAC.
    @PostMapping("/paiement-en-ligne/webhook")
    public Map<String, Object> onlinePaymentWebhook(@RequestBody String rawBody,
                                                    @RequestHeader(value = "X-PayHub-Signature", required = false) String signature) {
        return service.handleWebhook(rawBody, signature);
    }
}
