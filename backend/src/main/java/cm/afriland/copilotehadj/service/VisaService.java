package cm.afriland.copilotehadj.service;

import cm.afriland.copilotehadj.entity.Bordereau;
import cm.afriland.copilotehadj.entity.StatusHistory;
import cm.afriland.copilotehadj.entity.Versement;
import cm.afriland.copilotehadj.repository.BordereauRepository;
import cm.afriland.copilotehadj.web.ApiException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;

@Service
public class VisaService {

    private static final Set<String> VISA_STATUSES = Set.of("EN_ATTENTE", "EN_COURS", "ACCORDE", "REFUSE", "COMPLEMENT_REQUIS");
    private static final Map<String, String> MESSAGES = Map.of(
            "EN_ATTENTE", "Votre dossier a été reçu et est en attente de traitement.",
            "EN_COURS", "Votre dossier est en cours de traitement.",
            "ACCORDE", "Bonne nouvelle : votre visa a été accordé.",
            "REFUSE", "Votre demande de visa a été refusée. Contactez votre agence pour plus d'informations.",
            "COMPLEMENT_REQUIS", "Un complément de dossier est requis. Merci de contacter votre agence.");

    private final BordereauRepository repo;
    private final BordereauMapper mapper;
    private final NotificationService notifications;
    private final AuditService audit;

    public VisaService(BordereauRepository repo, BordereauMapper mapper, NotificationService notifications, AuditService audit) {
        this.repo = repo;
        this.mapper = mapper;
        this.notifications = notifications;
        this.audit = audit;
    }

    private void applyChange(Bordereau b, String newStatus, String note, String actor) {
        b.setVisaStatus(newStatus);
        StatusHistory h = new StatusHistory();
        h.setStatus(newStatus);
        h.setDate(LocalDate.now().toString());
        b.addStatusHistory(h);
        // Sur refus : marque les versements validés comme à rembourser.
        if ("REFUSE".equals(newStatus)) {
            for (Versement v : b.getVersements()) {
                if ("VALIDE".equals(v.getStatus()) && v.getRefundStatus() == null) {
                    v.setRefundStatus("A_REMBOURSER");
                    v.setRefundMethod(v.getMethod());
                }
            }
        }
        String msg = MESSAGES.getOrDefault(newStatus, "Mise à jour de votre dossier.");
        notifications.notifyPilgrim(b, "Copilote Hadj: " + msg + (note != null && !note.isBlank() ? " (" + note + ")" : ""));
    }

    @Transactional
    public Map<String, Object> changeStatus(String bordereauId, String newStatus, String note, String actor) {
        Bordereau b = repo.findById(bordereauId).orElseThrow(() -> new ApiException(404, "NOT_FOUND"));
        applyChange(b, newStatus, note, actor);
        repo.save(b);
        audit.log("CHANGEMENT_STATUT_VISA", bordereauId + " -> " + newStatus, actor);
        return mapper.decorate(b);
    }

    @Transactional
    public Map<String, Object> bulkChangeStatus(Map<String, Object> payload, String actor) {
        String newStatus = (String) payload.get("newStatus");
        String note = (String) payload.get("note");
        String encadreurId = (String) payload.get("encadreurId");
        @SuppressWarnings("unchecked")
        List<String> ids = (List<String>) payload.get("bordereauIds");

        List<Bordereau> targets;
        if (ids != null && !ids.isEmpty()) {
            targets = repo.findAllById(ids);
        } else if (encadreurId != null) {
            targets = repo.findByEncadreurId(encadreurId);
        } else {
            targets = List.of();
        }
        for (Bordereau b : targets) applyChange(b, newStatus, note, actor);
        repo.saveAll(targets);
        audit.log("CHANGEMENT_STATUT_VISA_EN_MASSE", targets.size() + " dossier(s) -> " + newStatus, actor);
        return Map.of("updatedCount", targets.size());
    }

    @Transactional
    public Map<String, Object> importStatuses(List<Map<String, Object>> rows, String encadreurId, String actor) {
        List<Map<String, Object>> updated = new ArrayList<>();
        List<Map<String, Object>> notFound = new ArrayList<>();
        List<Map<String, Object>> invalid = new ArrayList<>();
        int index = 0;
        for (Map<String, Object> row : rows) {
            index++;
            String idNumber = row.get("idNumber") == null ? null : String.valueOf(row.get("idNumber")).trim();
            String status = row.get("status") == null ? null : String.valueOf(row.get("status")).trim().toUpperCase();
            if (idNumber == null || idNumber.isBlank()) {
                invalid.add(Map.of("row", index, "reason", "MISSING_ID"));
                continue;
            }
            if (status == null || !VISA_STATUSES.contains(status)) {
                invalid.add(Map.of("row", index, "idNumber", idNumber, "reason", "INVALID_STATUS"));
                continue;
            }
            Bordereau b = repo.findFirstByIdNumber(idNumber).orElse(null);
            if (b == null || (encadreurId != null && !encadreurId.equals(b.getEncadreurId()))) {
                notFound.add(Map.of("row", index, "idNumber", idNumber));
                continue;
            }
            applyChange(b, status, "Import de statuts visa", actor);
            repo.save(b);
            updated.add(Map.of("bordereauId", b.getId(), "idNumber", idNumber, "status", status));
        }
        if (!updated.isEmpty()) audit.log("IMPORT_STATUTS_VISA", updated.size() + " dossier(s)", actor);
        return Map.of("updated", updated, "notFound", notFound, "invalid", invalid);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> checkAnomalies() {
        // Contrôle BI : dossiers ACCORDE mais solde non complet.
        List<Map<String, Object>> anomalies = new ArrayList<>();
        for (Bordereau b : repo.findAll()) {
            long paid = mapper.validatedAmount(b);
            long target = mapper.targetAmount(b);
            if ("ACCORDE".equals(b.getVisaStatus()) && paid < target) {
                anomalies.add(Map.of("bordereauId", b.getId(), "idNumber", b.getIdNumber(),
                        "pilgrimName", b.getPilgrimFirstName() + " " + b.getPilgrimLastName(),
                        "reason", "VISA_ACCORDE_SOLDE_INCOMPLET", "paid", paid, "target", target));
            }
        }
        return Map.of("anomalies", anomalies, "count", anomalies.size());
    }
}
