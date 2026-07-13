package cm.afriland.copilotehadj.service;

import cm.afriland.copilotehadj.entity.Season;
import cm.afriland.copilotehadj.repository.SeasonRepository;
import org.springframework.stereotype.Service;

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
        return seasonRepository.findAll().stream().findFirst().orElse(null);
    }

    /**
     * Prix à régler pour un pèlerin : prix de base du type, majoré des frais de
     * l'encadreur (commission par pèlerin) si pris en charge.
     */
    public long getPrice(Integer season, String pilgrimType, boolean includesEncadreurFees) {
        Season s = getSeason(season);
        long base = DEFAULT_OFFICIAL_PRICE;
        if (s != null && s.getPrices() != null && s.getPrices().get(pilgrimType) != null) {
            base = s.getPrices().get(pilgrimType);
        }
        long fees = 0;
        if (includesEncadreurFees && s != null && s.getCommissionPerPilgrim() != null) {
            fees = s.getCommissionPerPilgrim();
        }
        return base + fees;
    }
}
