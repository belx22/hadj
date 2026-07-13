package cm.afriland.copilotehadj.controller;

import cm.afriland.copilotehadj.entity.Encadreur;
import cm.afriland.copilotehadj.entity.Season;
import cm.afriland.copilotehadj.entity.SmtpSettings;
import cm.afriland.copilotehadj.service.AuditService;
import cm.afriland.copilotehadj.service.ReferenceService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Regroupe les contrôleurs référentiels (encadreurs, saisons, utilisateurs, SMTP, paramétrage). */
public class ReferenceControllers {

    @RestController
    @RequestMapping("/encadreurs")
    public static class EncadreurController {
        private final ReferenceService service;
        private final AuditService audit;

        public EncadreurController(ReferenceService service, AuditService audit) {
            this.service = service;
            this.audit = audit;
        }

        @GetMapping
        public List<Encadreur> list(@RequestParam(defaultValue = "true") boolean onlyActive,
                                    @RequestParam(required = false) String region) {
            return service.listEncadreurs(onlyActive, region);
        }

        @PostMapping
        public Encadreur create(@RequestBody Map<String, Object> body) {
            return service.createEncadreur(body, audit.currentUser());
        }

        @PutMapping("/{id}")
        public Encadreur update(@PathVariable String id, @RequestBody Map<String, Object> updates) {
            return service.updateEncadreur(id, updates, audit.currentUser());
        }

        @PostMapping("/import")
        @SuppressWarnings("unchecked")
        public Map<String, Object> importFile(@RequestBody Map<String, Object> body) {
            return service.importEncadreurs((List<Map<String, Object>>) body.get("rows"), audit.currentUser());
        }

        @GetMapping("/commissions")
        public List<Map<String, Object>> commissions(@RequestParam(required = false) Integer season) {
            return service.commissions(season);
        }
    }

    @RestController
    @RequestMapping("/saisons")
    public static class SeasonController {
        private final ReferenceService service;
        private final AuditService audit;

        public SeasonController(ReferenceService service, AuditService audit) {
            this.service = service;
            this.audit = audit;
        }

        @GetMapping
        public List<Season> list() {
            return service.listSeasons();
        }

        @PostMapping
        public Season create(@RequestBody Map<String, Object> body) {
            return service.createSeason(body, audit.currentUser());
        }

        @PutMapping("/{season}")
        public Season update(@PathVariable Integer season, @RequestBody Map<String, Object> updates) {
            return service.updateSeason(season, updates, audit.currentUser());
        }
    }

    @RestController
    @RequestMapping("/utilisateurs")
    public static class UserController {
        private final ReferenceService service;
        private final AuditService audit;

        public UserController(ReferenceService service, AuditService audit) {
            this.service = service;
            this.audit = audit;
        }

        @GetMapping
        public List<Map<String, Object>> list() {
            return service.listUsers();
        }

        @PostMapping
        public Map<String, Object> create(@RequestBody Map<String, Object> body) {
            return service.createUser(body, audit.currentUser());
        }

        @PutMapping("/{id}")
        public Map<String, Object> update(@PathVariable String id, @RequestBody Map<String, Object> updates) {
            return service.updateUser(id, updates, audit.currentUser());
        }

        @PostMapping("/import")
        @SuppressWarnings("unchecked")
        public Map<String, Object> importFile(@RequestBody Map<String, Object> body) {
            return service.importUsers((List<Map<String, Object>>) body.get("rows"), audit.currentUser());
        }
    }

    @RestController
    @RequestMapping("/parametrage")
    public static class ParametrageController {
        private final ReferenceService service;
        private final AuditService audit;

        public ParametrageController(ReferenceService service, AuditService audit) {
            this.service = service;
            this.audit = audit;
        }

        @GetMapping("/prix-officiel")
        public Map<String, Object> officialPrice(@RequestParam Integer season,
                                                 @RequestParam String pilgrimType,
                                                 @RequestParam(defaultValue = "false") boolean includesEncadreurFees) {
            return Map.of("price", service.officialPrice(season, pilgrimType, includesEncadreurFees));
        }

        @GetMapping("/smtp")
        public SmtpSettings getSmtp() {
            return service.smtp();
        }

        @PutMapping("/smtp")
        public SmtpSettings updateSmtp(@RequestBody Map<String, Object> body) {
            return service.updateSmtp(body, audit.currentUser());
        }
    }
}
