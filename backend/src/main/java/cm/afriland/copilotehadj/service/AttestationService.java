package cm.afriland.copilotehadj.service;

import cm.afriland.copilotehadj.entity.Bordereau;
import cm.afriland.copilotehadj.entity.Encadreur;
import cm.afriland.copilotehadj.repository.BordereauRepository;
import cm.afriland.copilotehadj.repository.EncadreurRepository;
import cm.afriland.copilotehadj.web.ApiException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;

@Service
public class AttestationService {

    private static final Set<String> DEPOSIT_TRUE = Set.of("OUI", "YES", "VRAI", "TRUE", "1", "DEPOSE", "DÉPOSÉ");
    private static final Set<String> DEPOSIT_FALSE = Set.of("NON", "NO", "FAUX", "FALSE", "0", "NON_DEPOSE", "NON DÉPOSÉ");

    private final BordereauRepository repo;
    private final EncadreurRepository encadreurRepo;
    private final BordereauMapper mapper;
    private final AuditService audit;

    public AttestationService(BordereauRepository repo, EncadreurRepository encadreurRepo, BordereauMapper mapper, AuditService audit) {
        this.repo = repo;
        this.encadreurRepo = encadreurRepo;
        this.mapper = mapper;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> passportDeposits(Integer season) {
        List<Bordereau> list = repo.findBySeason(season);
        List<Map<String, Object>> items = new ArrayList<>();
        for (Bordereau b : list) {
            Encadreur enc = b.getEncadreurId() == null ? null : encadreurRepo.findById(b.getEncadreurId()).orElse(null);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("bordereauId", b.getId());
            m.put("idNumber", b.getIdNumber());
            m.put("phone", b.getPhone());
            m.put("pilgrimName", b.getPilgrimFirstName() + " " + b.getPilgrimLastName());
            m.put("pilgrimCount", b.getPilgrimCount());
            m.put("encadreurId", b.getEncadreurId());
            m.put("encadreurName", enc != null ? enc.getName() : null);
            m.put("encadreurCode", enc != null ? enc.getCode() : null);
            m.put("passportDeposited", b.isPassportDeposited());
            m.put("passportDepositedAt", b.getPassportDepositedAt() == null ? null : b.getPassportDepositedAt().toString());
            items.add(m);
        }
        items.sort(Comparator.comparing(m -> Boolean.TRUE.equals(m.get("passportDeposited"))));
        long total = items.stream().mapToLong(m -> ((Number) m.getOrDefault("pilgrimCount", 1)).longValue()).sum();
        long deposited = items.stream().filter(m -> Boolean.TRUE.equals(m.get("passportDeposited")))
                .mapToLong(m -> ((Number) m.getOrDefault("pilgrimCount", 1)).longValue()).sum();
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("items", items);
        res.put("totalPilgrims", total);
        res.put("depositedPilgrims", deposited);
        res.put("remainingPilgrims", total - deposited);
        return res;
    }

    @Transactional
    public Map<String, Object> toggle(String bordereauId, boolean deposited, String actor) {
        Bordereau b = repo.findById(bordereauId).orElseThrow(() -> new ApiException(404, "NOT_FOUND"));
        b.setPassportDeposited(deposited);
        b.setPassportDepositedAt(deposited ? LocalDate.now() : null);
        repo.save(b);
        audit.log(deposited ? "DEPOT_PASSEPORT" : "ANNULATION_DEPOT_PASSEPORT", bordereauId, actor);
        return mapper.decorate(b);
    }

    @Transactional
    public Map<String, Object> importDeposits(List<Map<String, Object>> rows, Integer season, String actor) {
        List<Map<String, Object>> updated = new ArrayList<>();
        List<Map<String, Object>> notFound = new ArrayList<>();
        List<Map<String, Object>> invalid = new ArrayList<>();
        int index = 1;
        for (Map<String, Object> row : rows) {
            index++;
            String idNumber = row.get("idNumber") == null ? null : String.valueOf(row.get("idNumber")).trim();
            if (idNumber == null || idNumber.isBlank()) {
                invalid.add(Map.of("row", index, "reason", "MISSING_ID"));
                continue;
            }
            Boolean deposited = parseFlag(row.get("deposited"));
            if (deposited == null) {
                invalid.add(Map.of("row", index, "idNumber", idNumber, "reason", "INVALID_FLAG"));
                continue;
            }
            List<Bordereau> found = repo.findByIdNumberAndSeason(idNumber, season);
            if (found.isEmpty()) {
                notFound.add(Map.of("row", index, "idNumber", idNumber));
                continue;
            }
            Bordereau b = found.get(0);
            b.setPassportDeposited(deposited);
            b.setPassportDepositedAt(deposited ? LocalDate.now() : null);
            repo.save(b);
            updated.add(Map.of("bordereauId", b.getId(), "idNumber", idNumber,
                    "pilgrimName", b.getPilgrimFirstName() + " " + b.getPilgrimLastName(), "deposited", deposited));
        }
        if (!updated.isEmpty()) audit.log("IMPORT_DEPOTS_PASSEPORTS", updated.size() + " ligne(s)", actor);
        return Map.of("updated", updated, "notFound", notFound, "invalid", invalid);
    }

    private static Boolean parseFlag(Object raw) {
        String value = raw == null ? "" : String.valueOf(raw).trim().toUpperCase();
        if (value.isEmpty()) return true;
        if (DEPOSIT_TRUE.contains(value)) return true;
        if (DEPOSIT_FALSE.contains(value)) return false;
        return null;
    }
}
