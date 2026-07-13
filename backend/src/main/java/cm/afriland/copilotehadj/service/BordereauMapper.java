package cm.afriland.copilotehadj.service;

import cm.afriland.copilotehadj.entity.Bordereau;
import cm.afriland.copilotehadj.entity.Encadreur;
import cm.afriland.copilotehadj.entity.Versement;
import cm.afriland.copilotehadj.repository.EncadreurRepository;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Transforme un bordereau en représentation JSON enrichie de champs dérivés,
 * en miroir de `decorateBordereau` du mock frontend.
 */
@Service
public class BordereauMapper {

    private final PricingService pricing;
    private final EncadreurRepository encadreurRepository;

    public BordereauMapper(PricingService pricing, EncadreurRepository encadreurRepository) {
        this.pricing = pricing;
        this.encadreurRepository = encadreurRepository;
    }

    public long validatedAmount(Bordereau b) {
        return b.getVersements().stream().filter(v -> "VALIDE".equals(v.getStatus()))
                .mapToLong(v -> v.getAmount() == null ? 0 : v.getAmount()).sum();
    }

    public long pendingAmount(Bordereau b) {
        return b.getVersements().stream().filter(v -> "PENDING".equals(v.getStatus()))
                .mapToLong(v -> v.getAmount() == null ? 0 : v.getAmount()).sum();
    }

    public long targetAmount(Bordereau b) {
        int count = b.getPilgrimCount() == null ? 1 : b.getPilgrimCount();
        return (long) count * pricing.getPrice(b.getSeason(), b.getPilgrimType(), b.isIncludesEncadreurFees());
    }

    public Map<String, Object> decorate(Bordereau b) {
        long amountPaid = validatedAmount(b);
        long pending = pendingAmount(b);
        long target = targetAmount(b);
        long price = pricing.getPrice(b.getSeason(), b.getPilgrimType(), b.isIncludesEncadreurFees());
        int count = b.getPilgrimCount() == null ? 1 : b.getPilgrimCount();
        long eligible = price > 0 ? amountPaid / price : 0;
        Encadreur enc = b.getEncadreurId() == null ? null : encadreurRepository.findById(b.getEncadreurId()).orElse(null);
        String encadreurCode = enc != null ? enc.getCode() : null;

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", b.getId());
        m.put("reference", b.getReference());
        m.put("source", b.getSource());
        m.put("pilgrimLastName", b.getPilgrimLastName());
        m.put("pilgrimFirstName", b.getPilgrimFirstName());
        m.put("phone", b.getPhone());
        m.put("idNumber", b.getIdNumber());
        m.put("email", b.getEmail());
        m.put("region", b.getRegion());
        m.put("agency", b.getAgency());
        m.put("encadreurId", b.getEncadreurId());
        m.put("pilgrimType", b.getPilgrimType());
        m.put("pilgrimStatus", b.getPilgrimStatus());
        m.put("includesEncadreurFees", b.isIncludesEncadreurFees());
        m.put("pilgrimCount", count);
        m.put("season", b.getSeason());
        m.put("receiptNumber", b.getReceiptNumber());
        m.put("onlinePriority", b.isOnlinePriority());
        m.put("createdAt", b.getCreatedAt() == null ? null : b.getCreatedAt().toString());
        m.put("visaStatus", b.getVisaStatus());
        m.put("passportDeposited", b.isPassportDeposited());
        m.put("passportDepositedAt", b.getPassportDepositedAt() == null ? null : b.getPassportDepositedAt().toString());
        m.put("versements", versements(b));
        m.put("notifications", notifications(b));
        m.put("statusHistory", statusHistory(b));

        m.put("amountPaid", amountPaid);
        m.put("pendingAmount", pending);
        m.put("targetAmount", target);
        m.put("officialPrice", price);
        m.put("balance", target - amountPaid);
        m.put("eligiblePilgrims", eligible);
        m.put("isEligible", eligible >= count);
        m.put("isComplete", amountPaid >= target);
        m.put("encadreurCode", encadreurCode);
        m.put("paymentCode", encadreurCode != null ? b.getId() + "-" + encadreurCode : b.getId());
        return m;
    }

    public List<Map<String, Object>> versements(Bordereau b) {
        List<Map<String, Object>> list = new ArrayList<>();
        for (Versement v : b.getVersements()) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", v.getId());
            m.put("amount", v.getAmount());
            m.put("method", v.getMethod());
            m.put("reference", v.getReference());
            m.put("agency", v.getAgency());
            m.put("receiptImage", v.getReceiptImage());
            m.put("qrData", v.getQrData());
            m.put("otherDetails", v.getOtherDetails());
            m.put("accountNumber", v.getAccountNumber());
            m.put("status", v.getStatus());
            m.put("createdAt", v.getCreatedAt() == null ? null : v.getCreatedAt().toString());
            m.put("validatedAt", v.getValidatedAt() == null ? null : v.getValidatedAt().toString());
            m.put("validatedBy", v.getValidatedBy());
            m.put("note", v.getNote());
            m.put("refundStatus", v.getRefundStatus());
            m.put("refundedAt", v.getRefundedAt() == null ? null : v.getRefundedAt().toString());
            m.put("groupPaymentId", v.getGroupPaymentId());
            m.put("payerIdNumber", v.getPayerIdNumber());
            m.put("payerName", v.getPayerName());
            list.add(m);
        }
        return list;
    }

    private List<Map<String, Object>> notifications(Bordereau b) {
        List<Map<String, Object>> list = new ArrayList<>();
        b.getNotifications().forEach(n -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("date", n.getDate());
            m.put("message", n.getMessage());
            list.add(m);
        });
        return list;
    }

    private List<Map<String, Object>> statusHistory(Bordereau b) {
        List<Map<String, Object>> list = new ArrayList<>();
        b.getStatusHistory().forEach(s -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("status", s.getStatus());
            m.put("date", s.getDate());
            list.add(m);
        });
        return list;
    }
}
