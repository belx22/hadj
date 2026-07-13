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
public class BordereauService {

    private final BordereauRepository repo;
    private final BordereauMapper mapper;
    private final PricingService pricing;
    private final NotificationService notifications;
    private final AuditService audit;

    public BordereauService(BordereauRepository repo, BordereauMapper mapper, PricingService pricing,
                            NotificationService notifications, AuditService audit) {
        this.repo = repo;
        this.mapper = mapper;
        this.pricing = pricing;
        this.notifications = notifications;
        this.audit = audit;
    }

    private long nextSequence() {
        return repo.count() + 1;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> list(Map<String, String> filters) {
        List<Bordereau> items = repo.findAll();
        String region = filters.get("region");
        String encadreurId = filters.get("encadreurId");
        String agency = filters.get("agency");
        String pilgrimType = filters.get("pilgrimType");
        String season = filters.get("season");
        String from = filters.get("from");
        String to = filters.get("to");

        return items.stream()
                .filter(b -> region == null || region.equals(b.getRegion()))
                .filter(b -> encadreurId == null || encadreurId.equals(b.getEncadreurId()))
                .filter(b -> agency == null || agency.equals(b.getAgency()))
                .filter(b -> pilgrimType == null || pilgrimType.equals(b.getPilgrimType()))
                .filter(b -> season == null || (b.getSeason() != null && b.getSeason().equals(Integer.valueOf(season))))
                .filter(b -> from == null || (b.getCreatedAt() != null && b.getCreatedAt().toString().compareTo(from) >= 0))
                .filter(b -> to == null || (b.getCreatedAt() != null && b.getCreatedAt().toString().compareTo(to) <= 0))
                .sorted(Comparator.comparing((Bordereau b) -> b.getCreatedAt() == null ? LocalDate.MIN : b.getCreatedAt()).reversed())
                .map(mapper::decorate)
                .toList();
    }

    @Transactional(readOnly = true)
    public boolean checkDuplicate(String idNumber, Integer season) {
        return repo.existsByIdNumberAndSeason(idNumber, season);
    }

    @Transactional
    public Map<String, Object> createByAgent(Map<String, Object> payload, String actor) {
        String idNumber = str(payload.get("idNumber"));
        Integer season = intVal(payload.get("season"));
        if (repo.existsByIdNumberAndSeason(idNumber, season)) throw new ApiException(409, "DUPLICATE_PILGRIM");

        Bordereau b = base(payload);
        b.setSource("AGENT");
        b.setVisaStatus("EN_ATTENTE");
        long price = pricing.getPrice(season, b.getPilgrimType(), b.isIncludesEncadreurFees());
        long amount = (long) (b.getPilgrimCount() == null ? 1 : b.getPilgrimCount()) * price;

        Versement v = new Versement();
        v.setId(Ids.versementId());
        v.setAmount(amount);
        v.setMethod("AGENCE");
        v.setReference(b.getReceiptNumber());
        v.setAgency(b.getAgency());
        v.setStatus("VALIDE");
        v.setCreatedAt(LocalDate.now());
        v.setValidatedAt(LocalDate.now());
        v.setValidatedBy(actor);
        b.addVersement(v);

        b.addStatusHistory(history("EN_ATTENTE"));
        notifications.notifyPilgrim(b, "Copilote Hadj: votre souscription " + b.getId() + " a été enregistrée. Merci.");
        repo.save(b);
        audit.log("CREATION_BORDEREAU", b.getId(), actor);
        return mapper.decorate(b);
    }

    @Transactional
    public Map<String, Object> registerOnline(Map<String, Object> payload) {
        String idNumber = str(payload.get("idNumber"));
        Integer season = intVal(payload.get("season"));
        if (repo.existsByIdNumberAndSeason(idNumber, season)) throw new ApiException(409, "DUPLICATE_PILGRIM");

        Bordereau b = base(payload);
        b.setSource("ONLINE");
        b.setOnlinePriority(true);
        b.setVisaStatus("EN_ATTENTE");
        b.addStatusHistory(history("EN_ATTENTE"));
        notifications.notifyPilgrim(b, "Copilote Hadj: votre inscription en ligne " + b.getId() + " a été enregistrée.");
        repo.save(b);
        audit.log("INSCRIPTION_EN_LIGNE", b.getId(), idNumber);
        return mapper.decorate(b);
    }

    @Transactional
    public Map<String, Object> registerByEncadreur(Map<String, Object> payload, String encadreurId, String actor) {
        String idNumber = str(payload.get("idNumber"));
        Integer season = intVal(payload.get("season"));
        if (season == null) season = defaultSeason();
        if (repo.existsByIdNumberAndSeason(idNumber, season)) throw new ApiException(409, "DUPLICATE_PILGRIM");

        payload.put("season", season);
        Bordereau b = base(payload);
        b.setEncadreurId(encadreurId);
        b.setSource("ENCADREUR");
        b.setVisaStatus("EN_ATTENTE");
        String password = Ids.pilgrimPassword();
        b.setPilgrimPassword(password);
        b.addStatusHistory(history("EN_ATTENTE"));
        notifications.notifyPilgrim(b, "Copilote Hadj: votre dossier " + b.getId() + " a été créé par votre encadreur.");
        repo.save(b);
        audit.log("INSCRIPTION_ENCADREUR", b.getId(), actor);

        Map<String, Object> res = mapper.decorate(b);
        res.put("password", password);
        return res;
    }

    @Transactional
    public Map<String, Object> importPilgrims(List<Map<String, Object>> rows, String encadreurId, String actor) {
        List<Map<String, Object>> created = new ArrayList<>();
        List<Map<String, Object>> skipped = new ArrayList<>();
        List<Map<String, Object>> errors = new ArrayList<>();
        int season = defaultSeason();

        int index = 0;
        for (Map<String, Object> row : rows) {
            index++;
            String idNumber = str(row.get("idNumber"));
            if (idNumber == null || idNumber.isBlank()) {
                errors.add(Map.of("row", index, "reason", "MISSING_ID"));
                continue;
            }
            if (repo.existsByIdNumberAndSeason(idNumber, season)) {
                skipped.add(Map.of("row", index, "idNumber", idNumber));
                continue;
            }
            Map<String, Object> payload = new HashMap<>(row);
            payload.put("season", season);
            payload.putIfAbsent("pilgrimType", "PELERIN");
            payload.putIfAbsent("pilgrimStatus", "NOUVEAU");
            Bordereau b = base(payload);
            b.setEncadreurId(encadreurId);
            b.setSource("ENCADREUR");
            b.setVisaStatus("EN_ATTENTE");
            String password = Ids.pilgrimPassword();
            b.setPilgrimPassword(password);
            b.addStatusHistory(history("EN_ATTENTE"));
            repo.save(b);
            created.add(Map.of("bordereauId", b.getId(), "pilgrimName",
                    b.getPilgrimFirstName() + " " + b.getPilgrimLastName(), "idNumber", idNumber,
                    "phone", b.getPhone() == null ? "" : b.getPhone(), "password", password));
        }
        if (!created.isEmpty()) audit.log("IMPORT_PELERINS_ENCADREUR", created.size() + " pèlerin(s)", actor);
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("created", created);
        res.put("skipped", skipped);
        res.put("errors", errors);
        return res;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> pilgrimLogin(String idNumber, String secret) {
        Bordereau b = repo.findFirstByIdNumber(idNumber).orElse(null);
        if (b == null) throw new ApiException(404, "NOT_FOUND");
        boolean ok = secret != null && (secret.equals(b.getPhone()) || secret.equals(b.getPilgrimPassword()));
        if (!ok) throw new ApiException(401, "INVALID_CREDENTIALS");
        return mapper.decorate(b);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> encadreurGroup(String encadreurId) {
        return repo.findByEncadreurId(encadreurId).stream().map(mapper::decorate).toList();
    }

    // --- Helpers ---
    private Bordereau base(Map<String, Object> p) {
        Bordereau b = new Bordereau();
        long seq = nextSequence();
        b.setId(Ids.bordereauId(seq));
        b.setReceiptNumber(Ids.receiptNumber(seq));
        b.setReference(str(p.get("reference")));
        b.setPilgrimLastName(str(p.get("pilgrimLastName")));
        b.setPilgrimFirstName(str(p.get("pilgrimFirstName")));
        b.setPhone(str(p.get("phone")));
        b.setIdNumber(str(p.get("idNumber")));
        b.setEmail(str(p.get("email")));
        b.setRegion(str(p.get("region")));
        b.setAgency(str(p.get("agency")));
        if (p.get("encadreurId") != null) b.setEncadreurId(str(p.get("encadreurId")));
        b.setPilgrimType(p.get("pilgrimType") == null ? "PELERIN" : str(p.get("pilgrimType")));
        b.setPilgrimStatus(p.get("pilgrimStatus") == null ? "NOUVEAU" : str(p.get("pilgrimStatus")));
        b.setIncludesEncadreurFees(Boolean.TRUE.equals(p.get("includesEncadreurFees")));
        b.setPilgrimCount(p.get("pilgrimCount") == null ? 1 : intVal(p.get("pilgrimCount")));
        b.setSeason(p.get("season") == null ? defaultSeason() : intVal(p.get("season")));
        b.setOnlinePriority(Boolean.TRUE.equals(p.get("onlinePriority")));
        b.setCreatedAt(LocalDate.now());
        return b;
    }

    private StatusHistory history(String status) {
        StatusHistory h = new StatusHistory();
        h.setStatus(status);
        h.setDate(LocalDate.now().toString());
        return h;
    }

    private int defaultSeason() {
        var s = pricing.getSeason(null);
        return s != null && s.getSeason() != null ? s.getSeason() : 2027;
    }

    private static String str(Object o) {
        return o == null ? null : String.valueOf(o).trim();
    }

    private static Integer intVal(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.intValue();
        try {
            return (int) Double.parseDouble(String.valueOf(o).trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
