package cm.afriland.copilotehadj.controller;

import cm.afriland.copilotehadj.entity.AuditLog;
import cm.afriland.copilotehadj.repository.AuditLogRepository;
import cm.afriland.copilotehadj.service.AttestationService;
import cm.afriland.copilotehadj.service.AuditService;
import cm.afriland.copilotehadj.service.ReportingService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Contrôleurs reporting, attestations (dépôts passeports) et audit. */
public class MiscControllers {

    @RestController
    @RequestMapping("/reporting")
    public static class ReportingController {
        private final ReportingService service;

        public ReportingController(ReportingService service) {
            this.service = service;
        }

        @GetMapping
        public Map<String, Object> reporting(@RequestParam Map<String, String> filters) {
            return service.reporting(filters);
        }
    }

    @RestController
    @RequestMapping("/attestations/depots-passeports")
    public static class AttestationController {
        private final AttestationService service;
        private final AuditService audit;

        public AttestationController(AttestationService service, AuditService audit) {
            this.service = service;
            this.audit = audit;
        }

        @GetMapping
        public Map<String, Object> list(@RequestParam Integer season) {
            return service.passportDeposits(season);
        }

        @PutMapping("/{bordereauId}")
        public Map<String, Object> toggle(@PathVariable String bordereauId, @RequestBody Map<String, Object> body) {
            return service.toggle(bordereauId, Boolean.TRUE.equals(body.get("deposited")), audit.currentUser());
        }

        @PostMapping("/import")
        @SuppressWarnings("unchecked")
        public Map<String, Object> importFile(@RequestBody Map<String, Object> body) {
            Integer season = body.get("season") == null ? null : ((Number) body.get("season")).intValue();
            return service.importDeposits((List<Map<String, Object>>) body.get("rows"), season, audit.currentUser());
        }
    }

    @RestController
    @RequestMapping("/audit")
    public static class AuditController {
        private final AuditLogRepository repo;

        public AuditController(AuditLogRepository repo) {
            this.repo = repo;
        }

        @GetMapping
        public List<AuditLog> list() {
            return repo.findTop200ByOrderByTimestampDesc();
        }
    }
}
