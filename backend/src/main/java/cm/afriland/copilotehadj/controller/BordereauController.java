package cm.afriland.copilotehadj.controller;

import cm.afriland.copilotehadj.service.AuditService;
import cm.afriland.copilotehadj.service.BordereauService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/bordereaux")
public class BordereauController {

    private final BordereauService service;
    private final AuditService audit;

    public BordereauController(BordereauService service, AuditService audit) {
        this.service = service;
        this.audit = audit;
    }

    @GetMapping
    public List<Map<String, Object>> list(@RequestParam Map<String, String> filters) {
        return service.list(filters);
    }

    @GetMapping("/check-duplicate")
    public Map<String, Object> checkDuplicate(@RequestParam String idNumber, @RequestParam Integer season) {
        return Map.of("duplicate", service.checkDuplicate(idNumber, season));
    }

    @PostMapping
    public Map<String, Object> create(@RequestBody Map<String, Object> payload) {
        return service.createByAgent(payload, audit.currentUser());
    }

    @PostMapping("/inscription-en-ligne")
    public Map<String, Object> registerOnline(@RequestBody Map<String, Object> payload) {
        return service.registerOnline(payload);
    }
}
