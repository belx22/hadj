package cm.afriland.copilotehadj.service;

import cm.afriland.copilotehadj.entity.Season;
import cm.afriland.copilotehadj.repository.SeasonRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PricingService {

    public static final long DEFAULT_OFFICIAL_PRICE = 3_500_000L;

    private final SeasonRepository seasonRepository;

    public PricingService(SeasonRepository seasonRepository) {
        this.seasonRepository = seasonRepository;
    }

    public Season getSeason(Integer season) {
        if (season != null) {
            Season s = seasonRepository.findById(season).orElse(null);
            if (s != null) return s;
        }
        // Saison « courante » déterministe : la saison ouverte la plus récente,
        // sinon (aucune ouverte) la plus récente. findAll().findFirst() dépendait
        // de l'ordre physique des lignes en base et pouvait renvoyer une saison
        // fermée après une mise à jour Postgres (MVCC).
        var firstRow = PageRequest.of(0, 1);
        List<Season> open = seasonRepository.findOpenSeasonsMostRecentFirst(firstRow);
        if (!open.isEmpty()) return open.get(0);
        List<Season> all = seasonRepository.findAllMostRecentFirst(firstRow);
        return all.isEmpty() ? null : all.get(0);
    }

    /**
     * Prix à régler pour un pèlerin : prix de base du type, majoré des frais de
     * l'encadreur (commission par pèlerin) si pris en charge. Un encadreur ne
     * finance jamais sa propre commission : le type ENCADREUR en est exempté.
     */
    public long getPrice(Integer season, String pilgrimType, boolean includesEncadreurFees) {
        Season s = getSeason(season);
        long base = DEFAULT_OFFICIAL_PRICE;
        if (s != null && s.getPrices() != null && s.getPrices().get(pilgrimType) != null) {
            base = s.getPrices().get(pilgrimType);
        }
        long fees = 0;
        if (includesEncadreurFees && !"ENCADREUR".equals(pilgrimType) && s != null && s.getCommissionPerPilgrim() != null) {
            fees = s.getCommissionPerPilgrim();
        }
        return base + fees;
    }
}
