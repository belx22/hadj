package cm.afriland.copilotehadj.controller;

import cm.afriland.copilotehadj.service.AuditService;
import cm.afriland.copilotehadj.service.BordereauService;
import cm.afriland.copilotehadj.service.VersementService;
import cm.afriland.copilotehadj.service.VisaService;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/visa")
public class VisaController {

    private final VisaService visa;
    private final BordereauService bordereaux;
    private final VersementService versements;
    private final AuditService audit;

    public VisaController(VisaService visa, BordereauService bordereaux, VersementService versements, AuditService audit) {
        this.visa = visa;
        this.bordereaux = bordereaux;
        this.versements = versements;
        this.audit = audit;
    }

    @PostMapping("/pelerin/login")
    public Map<String, Object> pilgrimLogin(@RequestBody Map<String, String> body) {
        return bordereaux.pilgrimLogin(body.get("idNumber"), body.get("phone"));
    }

    @GetMapping("/encadreur/{encadreurId}/groupe")
    public List<Map<String, Object>> group(@PathVariable String encadreurId) {
        return bordereaux.encadreurGroup(encadreurId);
    }

    @PostMapping("/encadreur/inscription")
    public Map<String, Object> registerByEncadreur(@RequestBody Map<String, Object> body) {
        String encadreurId = (String) body.get("encadreurId");
        return bordereaux.registerByEncadreur(new HashMap<>(body), encadreurId, audit.currentUser());
    }

    @PostMapping("/encadreur/{encadreurId}/import")
    @SuppressWarnings("unchecked")
    public Map<String, Object> importPilgrims(@PathVariable String encadreurId, @RequestBody Map<String, Object> body) {
        return bordereaux.importPilgrims((List<Map<String, Object>>) body.get("rows"), encadreurId, audit.currentUser());
    }

    @PostMapping("/encadreur/{encadreurId}/import-versement-groupe")
    @SuppressWarnings("unchecked")
    public Map<String, Object> importGroupedVersement(@PathVariable String encadreurId, @RequestBody Map<String, Object> body) {
        return versements.importGroupedByEncadreur((List<Map<String, Object>>) body.get("rows"), encadreurId, body, audit.currentUser());
    }

    @PutMapping("/{bordereauId}/statut")
    public Map<String, Object> changeStatus(@PathVariable String bordereauId, @RequestBody Map<String, Object> body) {
        return visa.changeStatus(bordereauId, (String) body.get("status"), (String) body.get("note"), audit.currentUser());
    }

    @PutMapping("/statut-en-masse")
    public Map<String, Object> bulkChange(@RequestBody Map<String, Object> body) {
        return visa.bulkChangeStatus(body, audit.currentUser());
    }

    @PostMapping("/import-statuts")
    @SuppressWarnings("unchecked")
    public Map<String, Object> importStatuses(@RequestBody Map<String, Object> body) {
        return visa.importStatuses((List<Map<String, Object>>) body.get("rows"), (String) body.get("encadreurId"), audit.currentUser());
    }

    @GetMapping("/verification-bi")
    public Map<String, Object> checkBi() {
        return visa.checkAnomalies();
    }
}
