package cm.afriland.copilotehadj.service;

import cm.afriland.copilotehadj.entity.Encadreur;
import cm.afriland.copilotehadj.repository.EncadreurRepository;
import cm.afriland.copilotehadj.repository.SeasonRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class ReportingService {

    private final BordereauService bordereauService;
    private final EncadreurRepository encadreurRepo;
    private final SeasonRepository seasonRepo;
    private final PricingService pricing;

    public ReportingService(BordereauService bordereauService, EncadreurRepository encadreurRepo,
                            SeasonRepository seasonRepo, PricingService pricing) {
        this.bordereauService = bordereauService;
        this.encadreurRepo = encadreurRepo;
        this.seasonRepo = seasonRepo;
        this.pricing = pricing;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> reporting(Map<String, String> filters) {
        List<Map<String, Object>> items = bordereauService.list(filters);
        int season = filters.get("season") != null ? Integer.parseInt(filters.get("season"))
                : (pricing.getSeason(null) != null ? pricing.getSeason(null).getSeason() : 2027);

        long totalCollected = items.stream().mapToLong(b -> asLong(b.get("amountPaid"))).sum();
        long totalPending = items.stream().mapToLong(b -> asLong(b.get("pendingAmount"))).sum();
        long totalPilgrims = items.stream().mapToLong(b -> asLong(b.get("pilgrimCount"))).sum();
        long eligiblePilgrims = items.stream().mapToLong(b -> asLong(b.get("eligiblePilgrims"))).sum();
        long insufficient = items.stream().filter(b -> asLong(b.get("eligiblePilgrims")) < asLong(b.get("pilgrimCount"))).count();

        List<Map<String, Object>> byEncadreur = new ArrayList<>();
        for (Encadreur enc : encadreurRepo.findAll()) {
            List<Map<String, Object>> encItems = items.stream().filter(b -> enc.getId().equals(b.get("encadreurId"))).toList();
            if (encItems.isEmpty()) continue;
            byEncadreur.add(Map.of(
                    "encadreurId", enc.getId(),
                    "encadreurName", enc.getName(),
                    "collected", encItems.stream().mapToLong(b -> asLong(b.get("amountPaid"))).sum(),
                    "pilgrims", encItems.stream().mapToLong(b -> asLong(b.get("pilgrimCount"))).sum(),
                    "bordereaux", encItems.size()));
        }

        List<Map<String, Object>> byRegion = new ArrayList<>();
        for (String region : items.stream().map(b -> (String) b.get("region")).filter(Objects::nonNull).distinct().toList()) {
            List<Map<String, Object>> regionItems = items.stream().filter(b -> region.equals(b.get("region"))).toList();
            byRegion.add(Map.of("region", region,
                    "collected", regionItems.stream().mapToLong(b -> asLong(b.get("amountPaid"))).sum(),
                    "pilgrims", regionItems.stream().mapToLong(b -> asLong(b.get("pilgrimCount"))).sum()));
        }

        List<Map<String, Object>> byType = new ArrayList<>();
        for (String type : items.stream().map(b -> (String) b.get("pilgrimType")).filter(Objects::nonNull).distinct().toList()) {
            byType.add(Map.of("type", type, "count", items.stream().filter(b -> type.equals(b.get("pilgrimType"))).count()));
        }

        List<Map<String, Object>> seasonComparison = new ArrayList<>();
        seasonRepo.findAll().forEach(s -> {
            List<Map<String, Object>> seasonItems = bordereauService.list(Map.of("season", String.valueOf(s.getSeason())));
            seasonComparison.add(Map.of("season", s.getSeason(),
                    "collected", seasonItems.stream().mapToLong(b -> asLong(b.get("amountPaid"))).sum(),
                    "pilgrims", seasonItems.stream().mapToLong(b -> asLong(b.get("pilgrimCount"))).sum()));
        });

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("season", season);
        res.put("totalCollected", totalCollected);
        res.put("totalPending", totalPending);
        res.put("totalPilgrims", totalPilgrims);
        res.put("eligiblePilgrims", eligiblePilgrims);
        res.put("bordereauxCount", items.size());
        res.put("avgAmount", items.isEmpty() ? 0 : totalCollected / items.size());
        res.put("insufficientBalanceCount", insufficient);
        res.put("byEncadreur", byEncadreur);
        res.put("byRegion", byRegion);
        res.put("byType", byType);
        res.put("seasonComparison", seasonComparison);
        res.put("items", items);
        return res;
    }

    private static long asLong(Object o) {
        if (o instanceof Number n) return n.longValue();
        return 0;
    }
}
