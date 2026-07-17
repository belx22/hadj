package cm.afriland.copilotehadj.service;

import cm.afriland.copilotehadj.entity.Bordereau;
import cm.afriland.copilotehadj.entity.Encadreur;
import cm.afriland.copilotehadj.entity.Versement;
import cm.afriland.copilotehadj.repository.BordereauRepository;
import cm.afriland.copilotehadj.repository.EncadreurRepository;
import cm.afriland.copilotehadj.web.ApiException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;

@Service
public class VersementService {

    private final BordereauRepository repo;
    private final EncadreurRepository encadreurRepo;
    private final BordereauMapper mapper;
    private final NotificationService notifications;
    private final AuditService audit;

    private static final Set<String> VALIDE_ALIASES = Set.of("VALIDE", "VALIDÉ", "VALID", "OK", "CONFIRME", "CONFIRMÉ", "CONFIRMED", "PAID", "PAYE", "PAYÉ", "REGLE", "RÉGLÉ");
    private static final Set<String> REJETE_ALIASES = Set.of("REJETE", "REJETÉ", "REJECTED", "KO", "REFUSE", "REFUSÉ", "ECHEC", "ÉCHEC", "FAILED");

    public VersementService(BordereauRepository repo, EncadreurRepository encadreurRepo, BordereauMapper mapper,
                            NotificationService notifications, AuditService audit) {
        this.repo = repo;
        this.encadreurRepo = encadreurRepo;
        this.mapper = mapper;
        this.notifications = notifications;
        this.audit = audit;
    }

    private boolean referenceAlreadyValidated(Versement current) {
        String reference = current.getReference();
        if (reference == null || reference.isBlank()) return false;
        String group = current.getGroupPaymentId();
        return repo.findAll().stream().flatMap(b -> b.getVersements().stream())
                .anyMatch(v -> "VALIDE".equals(v.getStatus()) && reference.equals(v.getReference())
                        && !Objects.equals(v.getId(), current.getId())
                        // Deux versements d'un même paiement groupé partagent
                        // légitimement la référence du virement : ils ne sont pas
                        // des doublons l'un de l'autre. L'anti-doublon ne joue
                        // qu'entre paiements distincts (groupes différents, ou
                        // versement individuel réutilisant une référence).
                        && !(group != null && group.equals(v.getGroupPaymentId())));
    }

    @Transactional
    public Map<String, Object> createOnline(String idNumber, String phone, Map<String, Object> p) {
        Bordereau b = repo.findByIdNumberAndPhone(idNumber, phone).orElseThrow(() -> new ApiException(404, "NOT_FOUND"));
        long remaining = mapper.targetAmount(b) - mapper.validatedAmount(b) - mapper.pendingAmount(b);
        long amount = longVal(p.get("amount"));
        if (amount <= 0 || amount > remaining) throw new ApiException(400, "INVALID_AMOUNT");
        // Pas de paiement fractionné : le montant doit couvrir la totalité du solde.
        if (amount < remaining) throw new ApiException(400, "PARTIAL_NOT_ALLOWED");

        String method = str(p.get("method"));
        Versement v = newVersement(method, amount, str(p.get("reference")), p);
        b.addVersement(v);
        repo.save(b);
        audit.log("DECLARATION_VERSEMENT", b.getId(), idNumber);
        return mapper.decorate(b);
    }

    @Transactional
    public Map<String, Object> createGrouped(String payerIdNumber, String payerPhone, Map<String, Object> p) {
        Bordereau payer = repo.findByIdNumberAndPhone(payerIdNumber, payerPhone).orElseThrow(() -> new ApiException(404, "NOT_FOUND"));
        String groupPaymentId = "GRP-" + System.currentTimeMillis();
        String method = str(p.get("method"));
        String reference = str(p.get("reference"));
        List<Map<String, Object>> beneficiaries = asList(p.get("beneficiaries"));
        List<Map<String, Object>> results = new ArrayList<>();

        for (Map<String, Object> ben : beneficiaries) {
            String idNumber = str(ben.get("idNumber"));
            long amount = longVal(ben.get("amount"));
            Bordereau target = repo.findFirstByIdNumber(idNumber).orElse(null);
            if (target == null || amount <= 0) continue;
            Encadreur enc = target.getEncadreurId() == null ? null : encadreurRepo.findById(target.getEncadreurId()).orElse(null);
            Versement v = newVersement(method, amount, reference, p);
            v.setGroupPaymentId(groupPaymentId);
            v.setPayerIdNumber(payerIdNumber);
            v.setPayerName(payer.getPilgrimFirstName() + " " + payer.getPilgrimLastName());
            target.addVersement(v);
            repo.save(target);
            Map<String, Object> beneficiary = new LinkedHashMap<>();
            beneficiary.put("idNumber", idNumber);
            beneficiary.put("name", target.getPilgrimFirstName() + " " + target.getPilgrimLastName());
            beneficiary.put("amount", amount);
            beneficiary.put("encadreurCode", enc != null ? enc.getCode() : null);
            results.add(beneficiary);
        }
        audit.log("VERSEMENT_GROUPE_EN_LIGNE", groupPaymentId, payerIdNumber);
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("groupPaymentId", groupPaymentId);
        res.put("beneficiaries", results);
        return res;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> lookupBeneficiary(String idNumber, Integer season) {
        List<Bordereau> found = season == null ? repo.findFirstByIdNumber(idNumber).map(List::of).orElse(List.of())
                : repo.findByIdNumberAndSeason(idNumber, season);
        if (found.isEmpty()) return Map.of("found", false);
        Bordereau b = found.get(0);
        Encadreur enc = b.getEncadreurId() == null ? null : encadreurRepo.findById(b.getEncadreurId()).orElse(null);
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("found", true);
        res.put("bordereauId", b.getId());
        res.put("name", b.getPilgrimFirstName() + " " + b.getPilgrimLastName());
        res.put("encadreurCode", enc != null ? enc.getCode() : null);
        return res;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> pending() {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Bordereau b : repo.findAll()) {
            Encadreur enc = b.getEncadreurId() == null ? null : encadreurRepo.findById(b.getEncadreurId()).orElse(null);
            for (Versement v : b.getVersements()) {
                if (!"PENDING".equals(v.getStatus())) continue;
                rows.add(versementRow(b, v, enc));
            }
        }
        rows.sort((a, c) -> String.valueOf(c.get("createdAt")).compareTo(String.valueOf(a.get("createdAt"))));
        return rows;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> history(Map<String, String> filters) {
        String status = filters.get("status");
        String from = filters.get("from");
        String to = filters.get("to");
        String region = filters.get("region");
        String encadreurId = filters.get("encadreurId");
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Bordereau b : repo.findAll()) {
            if (region != null && !region.equals(b.getRegion())) continue;
            if (encadreurId != null && !encadreurId.equals(b.getEncadreurId())) continue;
            Encadreur enc = b.getEncadreurId() == null ? null : encadreurRepo.findById(b.getEncadreurId()).orElse(null);
            for (Versement v : b.getVersements()) {
                if (!"VALIDE".equals(v.getStatus()) && !"REJETE".equals(v.getStatus())) continue;
                if (status != null && !status.equals(v.getStatus())) continue;
                String d = v.getCreatedAt() == null ? "" : v.getCreatedAt().toString();
                if (from != null && d.compareTo(from) < 0) continue;
                if (to != null && d.compareTo(to) > 0) continue;
                rows.add(versementRow(b, v, enc));
            }
        }
        return rows;
    }

    @Transactional
    public Map<String, Object> validate(String bordereauId, String versementId, String actor) {
        Bordereau b = repo.findById(bordereauId).orElseThrow(() -> new ApiException(404, "NOT_FOUND"));
        Versement v = b.getVersements().stream().filter(x -> x.getId().equals(versementId)).findFirst()
                .orElseThrow(() -> new ApiException(404, "NOT_FOUND"));
        if (referenceAlreadyValidated(v)) throw new ApiException(409, "REFERENCE_ALREADY_USED");
        v.setStatus("VALIDE");
        v.setValidatedAt(LocalDate.now());
        v.setValidatedBy(actor);
        repo.save(b);
        audit.log("VALIDATION_PAIEMENT", bordereauId + " / " + versementId, actor);
        notifications.notifyPilgrim(b, "Copilote Hadj: votre versement a été validé et comptabilisé.");
        repo.save(b);
        return mapper.decorate(b);
    }

    @Transactional
    public Map<String, Object> bulkValidate(List<Map<String, Object>> items, String actor) {
        List<Map<String, Object>> validated = new ArrayList<>();
        List<Map<String, Object>> skipped = new ArrayList<>();
        for (Map<String, Object> item : items) {
            String bordereauId = str(item.get("bordereauId"));
            String versementId = str(item.get("versementId"));
            Bordereau b = repo.findById(bordereauId).orElse(null);
            if (b == null) continue;
            Versement v = b.getVersements().stream().filter(x -> x.getId().equals(versementId)).findFirst().orElse(null);
            if (v == null || !"PENDING".equals(v.getStatus())) continue;
            if (referenceAlreadyValidated(v)) {
                skipped.add(Map.of("bordereauId", bordereauId, "versementId", versementId, "reference", v.getReference()));
                continue;
            }
            v.setStatus("VALIDE");
            v.setValidatedAt(LocalDate.now());
            v.setValidatedBy(actor);
            notifications.notifyPilgrim(b, "Copilote Hadj: votre versement a été validé et comptabilisé.");
            repo.save(b);
            validated.add(Map.of("bordereauId", bordereauId, "versementId", versementId));
        }
        if (!validated.isEmpty()) audit.log("VALIDATION_PAIEMENT_EN_MASSE", validated.size() + " versement(s)", actor);
        return Map.of("validated", validated, "skipped", skipped);
    }

    @Transactional
    public Map<String, Object> reject(String bordereauId, String versementId, String reason, String actor) {
        Bordereau b = repo.findById(bordereauId).orElseThrow(() -> new ApiException(404, "NOT_FOUND"));
        Versement v = b.getVersements().stream().filter(x -> x.getId().equals(versementId)).findFirst()
                .orElseThrow(() -> new ApiException(404, "NOT_FOUND"));
        v.setStatus("REJETE");
        v.setNote(reason);
        v.setValidatedAt(LocalDate.now());
        v.setValidatedBy(actor);
        repo.save(b);
        audit.log("REJET_PAIEMENT", bordereauId + " / " + versementId, actor);
        notifications.notifyPilgrim(b, "Copilote Hadj: votre versement a été rejeté (" + (reason == null ? "référence invalide" : reason) + ").");
        repo.save(b);
        return mapper.decorate(b);
    }

    @Transactional
    public Map<String, Object> importStatusesByReference(List<Map<String, Object>> rows, String actor) {
        Map<String, String> refToStatus = new LinkedHashMap<>();
        for (Map<String, Object> row : rows) {
            String reference = str(row.get("reference"));
            if (reference == null || reference.isBlank()) continue;
            refToStatus.put(reference, normalizeStatus(str(row.get("status"))));
        }
        List<Map<String, Object>> updated = new ArrayList<>();
        List<Map<String, Object>> skipped = new ArrayList<>();
        for (Bordereau b : repo.findAll()) {
            boolean changed = false;
            for (Versement v : b.getVersements()) {
                if (!"PENDING".equals(v.getStatus())) continue;
                String ref = v.getReference() == null ? "" : v.getReference().trim();
                if (ref.isEmpty() || !refToStatus.containsKey(ref)) continue;
                String newStatus = refToStatus.get(ref);
                if ("VALIDE".equals(newStatus) && referenceAlreadyValidated(v)) {
                    skipped.add(Map.of("bordereauId", b.getId(), "versementId", v.getId(), "reference", ref));
                    continue;
                }
                v.setStatus(newStatus);
                v.setValidatedAt(LocalDate.now());
                v.setValidatedBy(actor);
                if ("REJETE".equals(newStatus)) v.setNote("Rapprochement bancaire (import)");
                updated.add(Map.of("bordereauId", b.getId(), "versementId", v.getId(), "reference", ref, "status", newStatus));
                changed = true;
            }
            if (changed) repo.save(b);
        }
        if (!updated.isEmpty()) audit.log("IMPORT_STATUTS_PAIEMENT", updated.size() + " versement(s)", actor);
        Set<String> matched = new HashSet<>();
        updated.forEach(u -> matched.add(String.valueOf(u.get("reference"))));
        skipped.forEach(u -> matched.add(String.valueOf(u.get("reference"))));
        List<String> unmatched = refToStatus.keySet().stream().filter(r -> !matched.contains(r)).toList();
        return Map.of("updated", updated, "skipped", skipped, "unmatched", unmatched);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> refunds() {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Bordereau b : repo.findAll()) {
            for (Versement v : b.getVersements()) {
                if (v.getRefundStatus() == null) continue;
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("bordereauId", b.getId());
                m.put("versementId", v.getId());
                m.put("pilgrimName", b.getPilgrimFirstName() + " " + b.getPilgrimLastName());
                m.put("idNumber", b.getIdNumber());
                m.put("amount", v.getAmount());
                m.put("method", v.getMethod());
                m.put("refundStatus", v.getRefundStatus());
                m.put("refundMethod", v.getRefundMethod());
                m.put("refundReference", v.getRefundReference());
                rows.add(m);
            }
        }
        return rows;
    }

    @Transactional
    public Map<String, Object> processRefund(String bordereauId, String versementId, Map<String, Object> p, String actor) {
        Bordereau b = repo.findById(bordereauId).orElseThrow(() -> new ApiException(404, "NOT_FOUND"));
        Versement v = b.getVersements().stream().filter(x -> x.getId().equals(versementId)).findFirst()
                .orElseThrow(() -> new ApiException(404, "NOT_FOUND"));
        v.setRefundStatus("REMBOURSE");
        v.setRefundedAt(LocalDate.now());
        v.setRefundMethod(str(p.get("refundMethod")));
        v.setRefundReference(str(p.get("refundReference")));
        repo.save(b);
        audit.log("REMBOURSEMENT", bordereauId + " / " + versementId, actor);
        return mapper.decorate(b);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> groupedPayments() {
        Map<String, Map<String, Object>> groups = new LinkedHashMap<>();
        for (Bordereau b : repo.findAll()) {
            for (Versement v : b.getVersements()) {
                if (v.getGroupPaymentId() == null) continue;
                Map<String, Object> g = groups.computeIfAbsent(v.getGroupPaymentId(), k -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("groupPaymentId", k);
                    m.put("payerIdNumber", v.getPayerIdNumber());
                    m.put("payerName", v.getPayerName());
                    m.put("createdAt", v.getCreatedAt() == null ? null : v.getCreatedAt().toString());
                    m.put("beneficiaries", new ArrayList<Map<String, Object>>());
                    return m;
                });
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> benes = (List<Map<String, Object>>) g.get("beneficiaries");
                Encadreur enc = b.getEncadreurId() == null ? null : encadreurRepo.findById(b.getEncadreurId()).orElse(null);
                Map<String, Object> bene = new LinkedHashMap<>();
                bene.put("idNumber", b.getIdNumber());
                bene.put("name", b.getPilgrimFirstName() + " " + b.getPilgrimLastName());
                bene.put("amount", v.getAmount());
                bene.put("encadreurCode", enc != null ? enc.getCode() : null);
                benes.add(bene);
            }
        }
        return new ArrayList<>(groups.values());
    }

    @Transactional
    public Map<String, Object> importGroupedByEncadreur(List<Map<String, Object>> rows, String encadreurId, Map<String, Object> p, String actor) {
        Encadreur enc = encadreurRepo.findById(encadreurId).orElse(null);
        String groupPaymentId = "GRP-" + System.currentTimeMillis();
        String method = str(p.get("method"));
        String reference = str(p.get("reference"));
        List<Map<String, Object>> created = new ArrayList<>();
        List<Map<String, Object>> notFound = new ArrayList<>();
        List<Map<String, Object>> invalidAmount = new ArrayList<>();
        int index = 0;
        for (Map<String, Object> row : rows) {
            index++;
            String phone = str(row.get("phone"));
            long amount = longVal(row.get("amount"));
            Bordereau b = repo.findByEncadreurId(encadreurId).stream().filter(x -> phone != null && phone.equals(x.getPhone())).findFirst().orElse(null);
            if (b == null) {
                notFound.add(Map.of("row", index, "phone", phone == null ? "" : phone));
                continue;
            }
            if (amount <= 0) {
                invalidAmount.add(Map.of("row", index, "phone", phone == null ? "" : phone));
                continue;
            }
            Versement v = newVersement(method, amount, reference, Map.of());
            v.setGroupPaymentId(groupPaymentId);
            v.setPayerName(enc != null ? enc.getName() : null);
            b.addVersement(v);
            repo.save(b);
            created.add(Map.of("bordereauId", b.getId(), "pilgrimName", b.getPilgrimFirstName() + " " + b.getPilgrimLastName(),
                    "phone", phone, "amount", amount));
        }
        if (!created.isEmpty()) audit.log("IMPORT_VERSEMENT_GROUPE_ENCADREUR", groupPaymentId, actor);
        return Map.of("groupPaymentId", groupPaymentId, "created", created, "notFound", notFound, "invalidAmount", invalidAmount);
    }

    // --- Helpers ---
    private Versement newVersement(String method, long amount, String reference, Map<String, Object> p) {
        Versement v = new Versement();
        v.setId(Ids.versementId());
        v.setAmount(amount);
        v.setMethod(method);
        v.setReference(reference);
        v.setAgency("AGENCE".equals(method) ? str(p.get("agency")) : null);
        v.setReceiptImage("AGENCE".equals(method) ? str(p.get("receiptImage")) : null);
        v.setOtherDetails("AUTRE".equals(method) ? str(p.get("otherDetails")) : null);
        v.setAccountNumber(str(p.get("accountNumber")));
        v.setStatus("PENDING");
        v.setCreatedAt(LocalDate.now());
        return v;
    }

    private Map<String, Object> versementRow(Bordereau b, Versement v, Encadreur enc) {
        Map<String, Object> m = new LinkedHashMap<>(mapper.versements(b).stream()
                .filter(x -> x.get("id").equals(v.getId())).findFirst().orElse(new LinkedHashMap<>()));
        m.put("bordereauId", b.getId());
        m.put("pilgrimName", b.getPilgrimFirstName() + " " + b.getPilgrimLastName());
        m.put("idNumber", b.getIdNumber());
        m.put("phone", b.getPhone());
        m.put("season", b.getSeason());
        m.put("region", b.getRegion());
        m.put("encadreurId", b.getEncadreurId());
        m.put("encadreurName", enc != null ? enc.getName() : null);
        return m;
    }

    private static String normalizeStatus(String raw) {
        String value = raw == null ? "" : raw.trim().toUpperCase();
        if (value.isEmpty()) return "VALIDE";
        if (REJETE_ALIASES.contains(value)) return "REJETE";
        if (VALIDE_ALIASES.contains(value)) return "VALIDE";
        return "VALIDE";
    }

    private static String str(Object o) {
        return o == null ? null : String.valueOf(o).trim();
    }

    private static long longVal(Object o) {
        if (o == null) return 0;
        if (o instanceof Number n) return n.longValue();
        try {
            return (long) Double.parseDouble(String.valueOf(o).trim());
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> asList(Object o) {
        if (o instanceof List<?> l) return (List<Map<String, Object>>) l;
        return List.of();
    }
}
