"""
Scenario expansion engine.
Given (title, description, genre_id) from Step 1, the LLM generates
a complete, genre-consistent world: tone, opening narrative, lore, entities,
and a power system with axes + stages (AI designs the power system itself
based on genre + lore — no hard-coded presets).
"""

from __future__ import annotations

import logging

from app.utils.json_parsing import parse_json_dict
from app.utils.lang import lang_name
from app.utils.slug import slugify

logger = logging.getLogger(__name__)

MIN_TITLE_WORDS = 1
MIN_DESCRIPTION_WORDS = 1

VALID_ENTITY_TYPES = {"rank", "faction", "location", "npc", "item", "secret"}

# ---------------------------------------------------------------------------
# Genre guidance (for world-building entities, not power system structure)
# ---------------------------------------------------------------------------

_GENRE_GUIDANCE = {
    "fantasy": {
        "en": "Fantasy world — magic allowed. "
              "Generate 3-5 major factions. Generate 5-8 named characters. "
              "Generate 2-3 legendary items. Generate 2-3 world secrets.",
        "vi": "The gioi Fantasy — phep thuat duoc phep. "
              "Tao 3-5 phe phai lon. Tao 5-8 nhan vat co ten. "
              "Tao 2-3 vat pham huyen thoai. Tao 2-3 bi mat the gioi.",
    },
    "scifi": {
        "en": "Science fiction world — technology, space, exploration. "
              "Generate 3-5 factions. Generate 5-8 named characters. "
              "Generate 2-3 advanced technologies. Generate 2-3 cosmic mysteries.",
        "vi": "The gioi Sci-Fi — cong nghe, vu tru, kham pha. "
              "Tao 3-5 phe phai. Tao 5-8 nhan vat co ten. "
              "Tao 2-3 cong nghe tien tien. Tao 2-3 bi an vu tru.",
    },
    "cyberpunk": {
        "en": "Cyberpunk / urban tech world — dark, gritty, tech infiltrating daily life. "
              "Generate 3-5 factions. Generate 5-8 named characters. "
              "Generate 2-3 high-tech items. Generate 2-3 dark secrets.",
        "vi": "The gioi Cyberpunk — u am, cong nghe xam nhap doi song. "
              "Tao 3-5 phe phai. Tao 5-8 nhan vat co ten. "
              "Tao 2-3 vat pham cong nghe cao. Tao 2-3 bi mat den toi.",
    },
    "horror": {
        "en": "Horror world — atmospheric dread and survival. "
              "Generate 3-5 survivor factions. Generate 5-8 named characters. "
              "Generate 2-3 cursed artifacts. Generate 2-3 world secrets.",
        "vi": "The gioi Kinh Di — rung rinh, sinh ton. "
              "Tao 3-5 phe phai song sot. Tao 5-8 nhan vat co ten. "
              "Tao 2-3 vat pham nguyen rua. Tao 2-3 bi mat the gioi.",
    },
    "historical": {
        "en": "Historical world — authentic, detailed, immersive (no magic). "
              "Generate 3-5 historical factions. Generate 5-8 named characters. "
              "Generate 2-3 significant artifacts. Generate 2-3 political secrets.",
        "vi": "The gioi Lich Su — chan thuc, chi tiet, nhap vai (khong ma thuat). "
              "Tao 3-5 phe phai lich su. Tao 5-8 nhan vat phu hop thoi dai. "
              "Tao 2-3 vat pham quan trong. Tao 2-3 bi mat chinh tri.",
    },
    "mystery": {
        "en": "Mystery / detective world — intrigue, deduction, revelation. "
              "Generate 3-5 factions. Generate 5-8 named characters. "
              "Generate 2-3 key clues. Generate 2-3 interconnected mysteries.",
        "vi": "The gioi Bi An — muu do, suy luan, phat hien. "
              "Tao 3-5 phe phai. Tao 5-8 nhan vat co ten. "
              "Tao 2-3 manh moi quan trong. Tao 2-3 bi an lien ket.",
    },
    "tu_tien_co_dien": {
        "en": "Classic Xianxia cultivation world — five great sects, immortal ambition. "
              "Generate 5 major sects with distinct philosophies. Generate 8-10 NPCs spanning all cultivation levels. "
              "Generate 3 legendary items or heaven-grade techniques. Generate 3 world-shaking secrets.",
        "vi": "The gioi Tien Hiep co dien — nam dai sect, bat tu. "
              "Tao 5 sect lon. Tao 8-10 NPC da cap tu vi. "
              "Tao 3 vat pham huyen thoai. Tao 3 bi mat the gioi.",
    },
    "ma_dao_ta_tu": {
        "en": "Demonic cultivation world — dark, ruthless, morally grey. "
              "Generate 4-5 major demonic sects. Generate 8-10 named characters. "
              "Generate 3 forbidden techniques or cursed items. Generate 3 world secrets.",
        "vi": "The gioi Ma Dao — den toi, tan nhan, dao duc xam. "
              "Tao 4-5 sect ma dao lon. Tao 8-10 nhan vat co ten. "
              "Tao 3 cong phap cam. Tao 3 bi mat the gioi.",
    },
    "phe_vat_nghich_thien": {
        "en": "Underdog ascension (Phe Vat Nghich Thien) — from trash to top. "
              "Generate 3-5 dominant forces that oppress the weak. "
              "Generate 5-8 named characters. "
              "Generate a hidden talent or secret inheritance. Generate 2-3 world-shaking secrets.",
        "vi": "The gioi Phe Vat Nghich Thien — tu rac rui len dinh. "
              "Tao 3-5 the luc ap buc ke yeu. "
              "Tao 5-8 nhan vat co ten. "
              "Tao tai nang an hoac di san bi mat. Tao 2-3 bi mat the gioi.",
    },
    "thuong_co_bi_canh": {
        "en": "Ancient secret realms — forbidden zones where time folds. "
              "Generate 3-5 factions guarding the realms. Generate 6-8 named characters. "
              "Generate 3 legendary treasures hidden within. Generate 2-3 sealed secrets.",
        "vi": "The gioi Bi Canh Thuong Co — vung cam thoi gian gap lai. "
              "Tao 3-5 phe phai tim kiem hoac bao ve. "
              "Tao 6-8 nhan vat co ten. "
              "Tao 3 bau vat an giau. Tao 2-3 bi mat bi phong an.",
    },
    "di_gioi_ma_phap": {
        "en": "Isekai / otherworld magic — empire, academy, guild. "
              "Generate 3-5 major factions. Generate 5-8 named characters. "
              "Generate 2-3 system-like items. Generate 2-3 world mysteries.",
        "vi": "The gioi Di Gioi — deu quoc, hoc vien, guild. "
              "Tao 3-5 phe phai lon. Tao 5-8 nhan vat co ten. "
              "Tao 2-3 vat pham he thong. Tao 2-3 bi an the gioi.",
    },
    "long_toe_de_quoc": {
        "en": "Dragon race & empire — dragon overlords, human nobility. "
              "Generate 3-5 dragon factions or noble houses. Generate 6-8 named characters. "
              "Generate 3 legendary dragon artifacts. Generate 3 empire-shaking secrets.",
        "vi": "The gioi Long Toc & De Quoc — rong thong tri, quy toc. "
              "Tao 3-5 phe rong hoac gia toc. Tao 6-8 nhan vat co ten. "
              "Tao 3 vat pham rong huyen thoai. Tao 3 bi mat de quoc.",
    },
    "thanh_chien_lien_minh": {
        "en": "Holy war alliance — multiple races and faiths united against a cosmic threat. "
              "Generate 3-5 factions. Generate 6-8 named characters. "
              "Generate 3 sacred relics. Generate 3 secrets about the enemy.",
        "vi": "The gioi Thanh Chien — da chu toc, lien minh chong moi de dọa. "
              "Tao 3-5 phe phai. Tao 6-8 nhan vat co ten. "
              "Tao 3 di vat thanh. Tao 3 bi mat ve ke thu.",
    },
    "giang_ho_hiep_khach": {
        "en": "Classic Wuxia — rivers and lakes, wandering heroes, martial sects. "
              "Generate 4-5 major martial sects. Generate 6-8 named martial artists. "
              "Generate 3 legendary martial manuals or weapons. Generate 3 hidden grudges.",
        "vi": "The gioi Vo Hiep co dien — giang ho, hiep khach, mon phai. "
              "Tao 4-5 mon phai lon. Tao 6-8 vo nhan co ten. "
              "Tao 3 tang kinh hoac vu khi huyen thoai. Tao 3 bi mat an on.",
    },
    "mon_phai_tranh_ba": {
        "en": "Wuxia sect rivalry — internal politics and inter-sect competition. "
              "Generate 4-5 rival sects. Generate 6-8 named characters. "
              "Generate 3 sect treasures or forbidden techniques. Generate 2-3 world-ending secrets.",
        "vi": "The gioi Vo Hiep tranh ba — chinh tri noi bo va tranh dau lien sect. "
              "Tao 4-5 sect tranh dua. Tao 6-8 nhan vat co ten. "
              "Tao 3 bau vat hoac cam ky. Tao 2-3 bi mat the gioi.",
    },
    "am_sat_tinh_anh": {
        "en": "Wuxia assassins & spies — shadows, contracts, hidden identities. "
              "Generate 3-5 assassination/spy organizations. Generate 6-8 named characters. "
              "Generate 3 legendary poisons or blades. Generate 3 conspiracy secrets.",
        "vi": "The gioi Vo Hiep am sat — bong toi, hop dong, danh tinh an. "
              "Tao 3-5 to chuc am sat/hiep lu. Tao 6-8 nhan vat co ten. "
              "Tao 3 doc duc hoac luoi dao huyen thoai. Tao 3 bi mat am muu.",
    },
    "di_nang_do_thi": {
        "en": "Urban superpower world — awakened abilities in modern city. "
              "Generate 3-5 factions. Generate 5-8 named characters. "
              "Generate 3 experimental items or augmentations. Generate 2-3 world secrets.",
        "vi": "The gioi Di Nang Do Thi — sieu nang luc trong thanh pho hien dai. "
              "Tao 3-5 phe phai. Tao 5-8 nhan vat co ten. "
              "Tao 3 vat pham thi nghiem. Tao 2-3 bi mat the gioi.",
    },
    "hao_mon_thuong_chien": {
        "en": "Corporate elite war — power, wealth, family secrets. "
              "Generate 3-5 rival corporations or family dynasties. Generate 6-8 named characters. "
              "Generate 3 corporate secrets. Generate 3 personal secrets.",
        "vi": "The gioi Hao Mon Thuong Chien — quyen luc, tien bac, bi mat gia toc. "
              "Tao 3-5 tap doan hoac gia toc doi dich. Tao 6-8 nhan vat co ten. "
              "Tao 3 bi mat cong ty. Tao 3 bi mat ca nhan.",
    },
    "y_thuat_than_thanh": {
        "en": "Supernatural medicine — between science and mysticism. "
              "Generate 3-5 hospital factions. Generate 5-8 named characters. "
              "Generate 3 forbidden medical techniques. Generate 2-3 patient secrets.",
        "vi": "The gioi Y Thuat Sieu Pham — giua khoa hoc va huyen hoc. "
              "Tao 3-5 to chuc benh vien. Tao 5-8 nhan vat co ten. "
              "Tao 3 ky thuat cam. Tao 2-3 bi mat benh nhan.",
    },
    "quy_di_dan_gian": {
        "en": "Folk horror — village customs, ancient curses, rural dread. "
              "Generate 3-5 village factions or family clans. Generate 5-8 named characters. "
              "Generate 3 cursed objects or village secrets. Generate 2-3 supernatural origins.",
        "vi": "The gioi Kinh Di Dan Gian — tuc le lang, nguyen rua co. "
              "Tao 3-5 phe lang. Tao 5-8 nhan vat co ten. "
              "Tao 3 vat nguyen. Tao 2-3 bi an nguon goc.",
    },
    "benh_vien_kinh_di": {
        "en": "Hospital horror — hidden floors, forbidden experiments. "
              "Generate 5-8 named characters. "
              "Generate 3 forbidden medical experiments. Generate 3 hospital floor secrets.",
        "vi": "The gioi Kinh Di Benh Vien — tang an, thi nghiem cam. "
              "Tao 5-8 nhan vat co ten. "
              "Tao 3 thi nghiem cam. Tao 3 bi mat tang benh vien.",
    },
    "lang_nguyen": {
        "en": "Cursed village — collective memory, water spirits, repeating tragedies. "
              "Generate 3-5 village factions. Generate 5-8 named characters. "
              "Generate 3 ritual artifacts. Generate 2-3 village history secrets.",
        "vi": "The gioi Lang Nguyen — ky uc tap the, thuy linh, bi kinh lap. "
              "Tao 3-5 phe lang. Tao 5-8 nhan vat co ten. "
              "Tao 3 vat pham nghiep le. Tao 2-3 bi mat lich su lang.",
    },
    "hien_dai_ngot_sung": {
        "en": "Modern sweet romance — contemporary, heartwarming. "
              "Generate 3-5 relationship web factions. Generate 5-8 named characters. "
              "Generate 2-3 key romantic milestones. Generate 2-3 past relationship secrets.",
        "vi": "The gioi Ngon Tinh Hien Dai — duong dai, ngot ngao. "
              "Tao 3-5 nhom quan he. Tao 5-8 nhan vat co ten. "
              "Tao 2-3 moc lang man quan trong. Tao 2-3 bi mat quan he cu.",
    },
    "co_dai_cung_dau": {
        "en": "Ancient palace romance — intrigue, power, forbidden love. "
              "Generate 3-5 court factions. Generate 6-8 named characters. "
              "Generate 3 palace secrets or forbidden alliances. Generate 2-3 hidden past connections.",
        "vi": "The gioi Ngon Tinh Co Dai Cung Dau — muu do, quyen luc, tinh yeu cam. "
              "Tao 3-5 phe cung dinh. Tao 6-8 nhan vat co ten. "
              "Tao 3 bi mat cung. Tao 2-3 ket noi qua khu an.",
    },
    "thanh_xuan_vuon_truong": {
        "en": "Youth campus romance — school, friendships, first love. "
              "Generate 3-5 school factions. Generate 5-8 named characters. "
              "Generate 3 school legends or traditions. Generate 2-3 school history secrets.",
        "vi": "The gioi Thanh Xuan — truong hoc, tinh ban, tinh dau. "
              "Tao 3-5 phe truong hoc. Tao 5-8 nhan vat co ten. "
              "Tao 3 truyen thuyet truong. Tao 2-3 bi mat lich su truong.",
    },
    "zombie_bung_phat": {
        "en": "Zombie apocalypse outbreak — survival, scarce resources, human monsters. "
              "Generate 3-5 survival factions. Generate 5-8 named characters. "
              "Generate 3 legendary weapons or safe locations. Generate 2-3 outbreak origin secrets.",
        "vi": "The gioi Mat The Zombie — sinh ton, tai nguyen khan hiem. "
              "Tao 3-5 phe sinh ton. Tao 5-8 nhan vat co ten. "
              "Tao 3 vu khi huyen thoai. Tao 2-3 bi mat nguon goc dich.",
    },
    "di_nang_mat_the": {
        "en": "Post-apocalypse awakened powers — mutation, faction wars, scarred world. "
              "Generate 3-5 survivor factions. Generate 5-8 named characters. "
              "Generate 3 legendary items or mutations. Generate 2-3 apocalypse origin secrets.",
        "vi": "The gioi Mat The Di Nang Thuc Tinh — dot bien, chien tranh phe. "
              "Tao 3-5 phe sinh ton. Tao 5-8 nhan vat co ten. "
              "Tao 3 vat pham huyen thoai. Tao 2-3 bi mat nguyen nhan mat the.",
    },
    "co_khi_hoang_tan": {
        "en": "Mech wasteland — giant machines, scavengers, post-collapse tech. "
              "Generate 3-5 factions. Generate 5-8 named characters. "
              "Generate 3 legendary mech parts. Generate 2-3 old civilization secrets.",
        "vi": "The gioi Co Khi Hoang Tan — co may khong lo, thọ may. "
              "Tao 3-5 phe phai. Tao 5-8 nhan vat co ten. "
              "Tao 3 linh kien huyen thoai. Tao 2-3 bi mat nen van minh cu.",
    },
    "vo_dich_he_thong": {
        "en": "Overpowered system — game-like world with quests, levels, skills. "
              "Generate 3-5 guild/faction systems. Generate 5-8 named characters. "
              "Generate 3 legendary skills or system glitches. Generate 2-3 system origin secrets.",
        "vi": "The gioi He Thong Vo Dich — game-like voi nhiem vu, cap do. "
              "Tao 3-5 phe guild. Tao 5-8 nhan vat co ten. "
              "Tao 3 ky nang huyen thoai. Tao 2-3 bi mat nguon goc he thong.",
    },
    "nong_trai_khong_gian": {
        "en": "Space farming system — pocket dimensions, magical crops, hidden costs. "
              "Generate 3-5 trading factions. Generate 5-8 named characters. "
              "Generate 3 rare seeds or farming secrets. Generate 2-3 pocket dimension creator secrets.",
        "vi": "The gioi Nong Trai Khong Gian — chieu Khong Gian tui, cay trong ma thuat. "
              "Tao 3-5 phe thuong mai. Tao 5-8 nhan vat co ten. "
              "Tao 3 hat giong hiem. Tao 2-3 bi mat ve nguoi tao chieu Khong Gian.",
    },
    "thuong_nhan_van_gioi": {
        "en": "Interworld merchant — parallel dimensions, trade, cosmic economics. "
              "Generate 3-5 merchant guilds or factions. Generate 5-8 named characters. "
              "Generate 3 legendary trade goods. Generate 2-3 balance-secrets.",
        "vi": "The gioi Thuong Nhan Van Gioi — chieu song song, thuong mai. "
              "Tao 3-5 guild thuong nhan. Tao 5-8 nhan vat co ten. "
              "Tao 3 mat hang huyen thoai. Tao 2-3 bi mat can bang.",
    },
    "an_phong_kin": {
        "en": "Locked room mystery — impossible crimes, clever solutions. "
              "Generate 5-8 named characters. "
              "Generate 3 physical clues. Generate 2-3 red herring secrets.",
        "vi": "The gioi An Phong Kin — toi ac bat kha thi, loi giai thong minh. "
              "Tao 5-8 nhan vat co ten. "
              "Tao 3 manh moi vat ly. Tao 2-3 bi mat danh lac huong.",
    },
    "tam_ly_toi_pham": {
        "en": "Psychological crime — deep profiling, interrogation, dark motives. "
              "Generate 3-5 interconnected criminal factions. Generate 5-8 named characters. "
              "Generate 3 psychological evidence pieces. Generate 2-3 hidden trauma secrets.",
        "vi": "The gioi Tam Ly Toi Pham — phan tich sau, tham van. "
              "Tao 3-5 phe toi pham lien ket. Tao 5-8 nhan vat co ten. "
              "Tao 3 bang chung tam ly. Tao 2-3 bi mat sang chan.",
    },
    "cold_case_lich_su": {
        "en": "Historical cold case — old documents, fading witnesses, buried truth. "
              "Generate 3-5 investigation factions. Generate 5-8 named characters. "
              "Generate 3 period-accurate clues. Generate 2-3 past conspiracy secrets.",
        "vi": "The gioi Cold Case Lich Su — tai lieu cu, nhan chung phai nhat. "
              "Tao 3-5 phe dieu tra. Tao 5-8 nhan vat co ten. "
              "Tao 3 manh moi thoi dai. Tao 2-3 bi mat am muu qua khu.",
    },
    "son_tinh_thuy_tinh": {
        "en": "Vietnamese mythology — Son Tinh vs Thuy Tinh conflict, spirits, ancient wars. "
              "Generate 3-5 spirit factions. Generate 6-8 named characters. "
              "Generate 3 sacred artifacts. Generate 3 cosmic secrets.",
        "vi": "The gioi Than Thoai Viet — xung dot Son Tinh vs Thuy Tinh, tinh linh. "
              "Tao 3-5 phe tinh linh. Tao 6-8 nhan vat co ten. "
              "Tao 3 vat pham thieng. Tao 3 bi mat vu tru.",
    },
    "lac_long_au_co": {
        "en": "Vietnamese dragon-fairy myth — Lac Long Quan and Au Co lineage. "
              "Generate 3-5 dragon and fairy factions. Generate 6-8 named hybrid descendants. "
              "Generate 3 sacred dragon/fairy artifacts. Generate 3 ancient separation secrets.",
        "vi": "The gioi Than Thoai Lac Long — huyet thong rong-tien. "
              "Tao 3-5 phe rong va tien. Tao 6-8 nhan vat hau due lai. "
              "Tao 3 vat pham thieng. Tao 3 bi mat ve cuoc chia ly co.",
    },
    "thanh_giong": {
        "en": "Vietnamese sacred hero — Thanh Giong, divine armor, foreign invaders. "
              "Generate 3-5 factions. Generate 6-8 named characters. "
              "Generate 3 sacred weapons or armor pieces. Generate 2-3 hero return cost secrets.",
        "vi": "The gioi Thanh Giong — giap than, giac ngoai xam. "
              "Tao 3-5 phe phai. Tao 6-8 nhan vat co ten. "
              "Tao 3 vu khi hoac giap thieng. Tao 2-3 bi mat ve cai gia that cua su tro ve.",
    },
    "mau_va_loi_the": {
        "en": "Dark fantasy blood oaths — cursed kingdoms, blood magic, fallen heroes. "
              "Generate 3-5 dark factions. Generate 6-8 named characters. "
              "Generate 3 cursed blood artifacts. Generate 3 world-ending secrets.",
        "vi": "The gioi Dark Fantasy — loi the mau, ma thuat nguyen. "
              "Tao 3-5 phe den. Tao 6-8 nhan vat co ten. "
              "Tao 3 vat pham nguyen mau. Tao 3 bi mat ket thuc the gioi.",
    },
    "quy_vuong_phe_phai": {
        "en": "Demon king factions — political fantasy, demon lords, crumbling empire. "
              "Generate 4-5 rival demon courts or human kingdoms. Generate 6-8 named characters. "
              "Generate 3 legendary demon weapons. Generate 3 imperial conspiracy secrets.",
        "vi": "The gioi Quy Vuong Phe Phai — chinh tri fantasy, quy vuong. "
              "Tao 4-5 quy trieu hoac vuong quoc doi dich. Tao 6-8 nhan vat co ten. "
              "Tao 3 vu khi quy huyen thoai. Tao 3 bi mat am muu de che.",
    },
    "kiem_si_bi_ruong_bo": {
        "en": "Ostracized blade master — war guilt, redemption road, broken swords. "
              "Generate 3-5 war faction remnants. Generate 5-8 named characters. "
              "Generate 3 legendary broken weapons. Generate 2-3 wrong order secrets.",
        "vi": "The gioi Kiem Si Bi Ruong Bo — toi loi chien tranh, con duong chuoc toi. "
              "Tao 3-5 phe di tich chien tranh. Tao 5-8 nhan vat co ten. "
              "Tao 3 vu khi gay huyen thoai. Tao 2-3 bi mat ve ke ra lenh sai.",
    },
    "hoc_vien_di_nang": {
        "en": "Supernatural academy — hidden floors, dangerous practicals, cursed school. "
              "Generate 3-5 school factions. Generate 5-8 named characters. "
              "Generate 3 forbidden techniques or cursed items. Generate 2-3 school conspiracy secrets.",
        "vi": "The gioi Hoc Vien Di Nang — tang an, thuc hanh nguy hiem. "
              "Tao 3-5 phe truong hoc. Tao 5-8 nhan vat co ten. "
              "Tao 3 ky thuat cam. Tao 2-3 bi mat am muu truong.",
    },
    "clb_huyen_hoc": {
        "en": "Occult club — forbidden rituals, seance, otherworldly contacts. "
              "Generate 3-5 club member factions. Generate 5-8 named characters. "
              "Generate 3 forbidden ritual artifacts. Generate 2-3 other side secrets.",
        "vi": "The gioi CLB Huyen Hoc — nghi le cam, goi hon. "
              "Tao 3-5 phe thanh vien. Tao 5-8 nhan vat co ten. "
              "Tao 3 vat pham nghi le cam. Tao 2-3 bi mat the gioi ben kia.",
    },
    "dem_truong_khong_ngu": {
        "en": "Sleepless school night — time loops, empty corridors, trapped students. "
              "Generate 3-5 trapped student groups. Generate 5-8 named characters. "
              "Generate 3 room escape artifacts. Generate 2-3 why the school exists secrets.",
        "vi": "The gioi Dem Truong Khong Ngu — vong thoi gian, hanh lang trong. "
              "Tao 3-5 nhom hoc sinh mac ket. Tao 5-8 nhan vat co ten. "
              "Tao 3 vat pham thoat phong. Tao 2-3 bi mat vi sao truong ton tai.",
    },
}


# ---------------------------------------------------------------------------
# Genre -> power system style hints (not presets — just style guidance)
# ---------------------------------------------------------------------------

_GENRE_PS_HINTS = {
    "fantasy":               {"sub_tiers": "Early, Mid, Late",              "stage_count_range": "4-7"},
    "scifi":                 {"sub_tiers": "Tier 1, Tier 2, Tier 3",        "stage_count_range": "4-7"},
    "cyberpunk":             {"sub_tiers": "Early, Mid, Late",               "stage_count_range": "4-7"},
    "horror":                {"sub_tiers": "",                               "stage_count_range": "3-6"},
    "historical":            {"sub_tiers": "",                               "stage_count_range": "4-7"},
    "mystery":               {"sub_tiers": "",                               "stage_count_range": "3-6"},
    "tu_tien_co_dien":       {"sub_tiers": "So Ky, Trung Ky, Hau Ky",        "stage_count_range": "7-12"},
    "ma_dao_ta_tu":          {"sub_tiers": "So Ky, Trung Ky, Hau Ky",        "stage_count_range": "7-12"},
    "phe_vat_nghich_thien":  {"sub_tiers": "So Ky, Trung Ky, Hau Ky",        "stage_count_range": "6-12"},
    "thuong_co_bi_canh":     {"sub_tiers": "",                               "stage_count_range": "4-8"},
    "di_gioi_ma_phap":       {"sub_tiers": "So Ky, Trung Ky, Hau Ky",        "stage_count_range": "4-7"},
    "long_toe_de_quoc":      {"sub_tiers": "",                               "stage_count_range": "4-7"},
    "thanh_chien_lien_minh": {"sub_tiers": "So Ky, Trung Ky, Hau Ky",        "stage_count_range": "4-7"},
    "giang_ho_hiep_khach":   {"sub_tiers": "So Dang, Trung Dang, Thuong Dang","stage_count_range": "4-7"},
    "mon_phai_tranh_ba":     {"sub_tiers": "So Dang, Trung Dang, Thuong Dang","stage_count_range": "4-7"},
    "am_sat_tinh_anh":       {"sub_tiers": "Tan Thu, Chuyen Gia, Bac Thay",   "stage_count_range": "4-7"},
    "di_nang_do_thi":        {"sub_tiers": "",                               "stage_count_range": "4-8"},
    "hao_mon_thuong_chien":  {"sub_tiers": "",                               "stage_count_range": "4-8"},
    "y_thuat_than_thanh":    {"sub_tiers": "",                               "stage_count_range": "4-8"},
    "quy_di_dan_gian":       {"sub_tiers": "",                               "stage_count_range": "3-6"},
    "benh_vien_kinh_di":     {"sub_tiers": "",                               "stage_count_range": "3-6"},
    "lang_nguyen":           {"sub_tiers": "",                               "stage_count_range": "3-6"},
    "hien_dai_ngot_sung":    {"sub_tiers": "",                               "stage_count_range": "4-8"},
    "co_dai_cung_dau":       {"sub_tiers": "",                               "stage_count_range": "4-8"},
    "thanh_xuan_vuon_truong":{"sub_tiers": "",                               "stage_count_range": "4-7"},
    "zombie_bung_phat":      {"sub_tiers": "",                               "stage_count_range": "3-6"},
    "di_nang_mat_the":       {"sub_tiers": "",                               "stage_count_range": "3-6"},
    "co_khi_hoang_tan":      {"sub_tiers": "",                               "stage_count_range": "4-7"},
    "vo_dich_he_thong":      {"sub_tiers": "",                               "stage_count_range": "5-12"},
    "nong_trai_khong_gian":  {"sub_tiers": "",                               "stage_count_range": "4-8"},
    "thuong_nhan_van_gioi":  {"sub_tiers": "",                               "stage_count_range": "4-7"},
    "an_phong_kin":          {"sub_tiers": "",                               "stage_count_range": "3-6"},
    "tam_ly_toi_pham":       {"sub_tiers": "",                               "stage_count_range": "3-6"},
    "cold_case_lich_su":     {"sub_tiers": "",                               "stage_count_range": "3-6"},
    "son_tinh_thuy_tinh":    {"sub_tiers": "",                               "stage_count_range": "4-7"},
    "lac_long_au_co":        {"sub_tiers": "",                               "stage_count_range": "4-7"},
    "thanh_giong":           {"sub_tiers": "",                               "stage_count_range": "4-7"},
    "mau_va_loi_the":        {"sub_tiers": "So Ky, Trung Ky, Hau Ky",        "stage_count_range": "4-7"},
    "quy_vuong_phe_phai":    {"sub_tiers": "So Ky, Trung Ky, Hau Ky",        "stage_count_range": "4-8"},
    "kiem_si_bi_ruong_bo":   {"sub_tiers": "",                               "stage_count_range": "4-7"},
    "hoc_vien_di_nang":      {"sub_tiers": "",                               "stage_count_range": "4-7"},
    "clb_huyen_hoc":         {"sub_tiers": "",                               "stage_count_range": "3-6"},
    "dem_truong_khong_ngu":  {"sub_tiers": "",                               "stage_count_range": "3-6"},
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_genre_guidance(genre_id: str | None, language: str) -> str:
    if genre_id and genre_id in _GENRE_GUIDANCE:
        return _GENRE_GUIDANCE[genre_id].get(language, _GENRE_GUIDANCE[genre_id]["en"])
    return _GENRE_GUIDANCE.get("fantasy", {}).get(language, _GENRE_GUIDANCE["fantasy"]["en"])


def _get_ps_hints(genre_id: str | None) -> dict:
    if genre_id and genre_id in _GENRE_PS_HINTS:
        return _GENRE_PS_HINTS[genre_id]
    return {"sub_tiers": "Early, Mid, Late", "stage_count_range": "4-7"}


# ---------------------------------------------------------------------------
# JSON example (used inside prompt — safe from f-string brace issues)
# ---------------------------------------------------------------------------

_JSON_EXAMPLE = """{
  "protagonist_name": "Linh Dong",
  "narrative_pov": "second_person",
  "writing_style": "chinh_thong",
  "tone_instructions": "",
  "opening_narrative": "",
  "lore_text": "",
  "power_system": {
    "power_system_name": "...",
    "axes": [
      {
        "axis_id": "primary_axis",
        "axis_name": "...",
        "is_primary": true,
        "description": "",
        "stages": [
          {
            "name": "Stage Display Name (e.g. Trúc Cơ)",
            "order": 1,
            "stage_style": "early_mid_late",
            "sub_stages": [
              {"key": "so_ky", "name": "Sơ Kỳ"},
              {"key": "trung_ky", "name": "Trung Kỳ"},
              {"key": "hau_ky", "name": "Hậu Kỳ"}
            ]
          }
        ]
      }
    ]
  },
  "entities": [
    {"type": "faction", "name": "...", "description": "...", "leader": "", "alignment": "", "influence": 5},
    {"type": "npc", "name": "...", "description": "...", "faction": "", "role": "", "realm": "", "sub_tier": 2},
    {"type": "item", "name": "...", "description": "...", "rarity": "", "owner": ""},
    {"type": "secret", "name": "...", "description": "...", "revealed_to": ""},
    {"type": "location", "name": "...", "description": "...", "faction": ""}
  ]
}"""


# ---------------------------------------------------------------------------
# Prompt builders
# ---------------------------------------------------------------------------

def _build_system_prompt(
    language: str,
    genre_id: str | None,
    title: str,
    description: str,
    lore_text: str,
) -> str:
    lang_label = lang_name(language)
    genre_guidance = _get_genre_guidance(genre_id, language)
    ps_hints = _get_ps_hints(genre_id)
    sub_tiers_hint = ps_hints["sub_tiers"]
    stage_range = ps_hints["stage_count_range"]

    lore_snippet = lore_text.strip()[:500] if lore_text.strip() else "(no lore provided)"

    return (
        f"You are a creative RPG scenario architect. You write in {lang_label}.\n\n"
        f"The user has provided:\n"
        f"  TITLE: {title.strip() or '(empty)'}\n"
        f"  DESCRIPTION: {description.strip() or '(empty)'}\n"
        f"  GENRE: {genre_id or 'generic'}\n"
        f"  LORE: {lore_snippet}\n\n"
        f"WORLD ENTITIES (generate based on genre):\n{genre_guidance}\n\n"
        f"POWER SYSTEM DESIGN:\n"
        f"Design a complete power system that fits this world's logic.\n"
        f"  - Decide how many AXES (progression dimensions) make sense.\n"
        f"    Urban superpower world: often 5-8 axes (Finance, Status, Fashion, Connections, Influence, ...).\n"
        f"    Xianxia world: often 3-6 axes (Cultivation, Alchemy, Martial Arts, Artifact, Soul, ...).\n"
        f"    Mystery world: try 2-4 axes (Investigation, Forensic, ...).\n"
        f"    Romance world: often 4-6 axes (Appearance, Finance, Intelligence, Charm, ...).\n"
        f"    There is NO hard maximum: use as many DISTINCT axes as the lore requires — "
        f"typically 3-7, but rich worlds may need 8-12+. Avoid redundant or overlapping axes.\n"
        f"  - For each axis:\n"
        f"    * axis_id: lowercase underscore key (e.g. 'tu_luc', 'tai_chinh')\n"
        f"    * axis_name: evocative name\n"
        f"    * is_primary: true for the main axis\n"
        f"    * description: one sentence\n"
        f"    * stages: {stage_range} stage names (weakest to strongest)\n"
        f"    * each stage has sub_stages using '{sub_tiers_hint}'\n\n"
        f"NARRATIVE IDENTITY:\n"
        f"  protagonist_name: Generate a fitting main character name for this world's genre and setting. "
        f"Consider the cultural/literary style of the genre. "
        f"For fantasy/xianxia: use names like Linh Dong, Vân Tiêu, Tần Phong. "
        f"For cyberpunk/scifi: use names like Kai Chen, Zara Vex, Nova Reed. "
        f"For urban/modern: use names like Minh Huy, Linh Chi, Khải Minh. "
        f"Generate a compelling, genre-appropriate name. NEVER leave this empty.\n"
        f"  narrative_pov: first_person | second_person | third_person | omniscient\n"
        f"  writing_style: chinh_thong | hao_sang | lanh_khot | tho_mong | hai_huoc | kich_tinh\n\n"
        f"Return ONLY valid JSON (no markdown, no explanation).\n\n"
        + _JSON_EXAMPLE
        + "\n\nIMPORTANT: Return the user's title and description EXACTLY as provided."
    )


def _build_user_message(title: str, description: str, language: str) -> str:
    lang_label = lang_name(language)
    parts = [
        f"[Write your response in {lang_label}]",
        f"TITLE:\n{title.strip()}",
    ]
    if description.strip():
        parts.append(f"DESCRIPTION:\n{description.strip()}")
    else:
        parts.append("DESCRIPTION:\n(no description — generate freely based on genre)")
    parts.append(
        "\nBuild the complete world from these seeds. "
        "Be creative, specific, and internally consistent. "
        "Design the power system to match this world's unique logic."
    )
    return "\n\n".join(parts)


# ---------------------------------------------------------------------------
# Normalizers
# ---------------------------------------------------------------------------


def _normalize_entity(raw: dict) -> dict | None:
    etype = str(raw.get("type", "")).lower().strip()
    if etype not in VALID_ENTITY_TYPES:
        return None
    name = str(raw.get("name", "")).strip()
    if not name:
        return None

    def _slug_to_display(text: str) -> str:
        """Convert underscore slug back to readable display name, or return as-is."""
        if not text or "_" not in text:
            return text
        return " ".join(part.capitalize() for part in text.replace("-", "_").split("_"))

    entity: dict = {
        "type": etype,
        "name": name,
        "description": str(raw.get("description", "") or "").strip(),
    }
    if etype == "rank":
        entity["parent"] = str(raw.get("parent") or "").strip()
        entity["sub_tiers"] = str(raw.get("sub_tiers") or "").strip()
        entity["power_value"] = max(1, int(raw.get("power_value") or 1))
    elif etype == "faction":
        entity["leader"] = str(raw.get("leader") or "").strip()
        entity["alignment"] = str(raw.get("alignment") or "").strip()
        entity["influence"] = max(1, min(10, int(raw.get("influence") or 5)))
    elif etype == "location":
        entity["faction"] = str(raw.get("faction") or "").strip()
    elif etype == "npc":
        entity["faction"] = str(raw.get("faction") or "").strip()
        entity["role"] = str(raw.get("role") or "").strip()
        # realm / sub_tier: always store as display name, never as internal slug
        realm_raw = str(raw.get("realm") or "").strip()
        entity["realm"] = _slug_to_display(realm_raw)
        sub_tier_raw = raw.get("sub_tier")
        if isinstance(sub_tier_raw, str) and sub_tier_raw.strip():
            sub_tier_num = max(1, min(3, int(sub_tier_raw)))
        else:
            sub_tier_num = max(1, min(3, int(sub_tier_raw or 2)))
        entity["sub_tier"] = sub_tier_num
    elif etype == "item":
        entity["rarity"] = str(raw.get("rarity") or "").strip()
        entity["owner"] = str(raw.get("owner") or "").strip()
    elif etype == "secret":
        entity["revealed_to"] = str(raw.get("revealed_to") or "").strip()
    return entity


def _normalize_power_system(ps: dict) -> dict:
    """Normalize a power_system dict returned from the LLM."""

    def _slug_to_display(text: str) -> str:
        """Convert underscore slug back to readable display name, or return as-is."""
        if not text or "_" not in text:
            return text
        return " ".join(part.capitalize() for part in text.replace("-", "_").split("_"))

    system_name = str(ps.get("power_system_name", "Power System"))
    raw_axes = ps.get("axes") or []

    axes = []
    has_primary = False
    for i, ax in enumerate(raw_axes):
        if not isinstance(ax, dict):
            continue

        sub_labels_raw = ax.get("sub_stage_labels") or ax.get("sub_tier_labels") or []
        if not sub_labels_raw and ax.get("stages"):
            first_st = (ax.get("stages") or [{}])[0]
            raw_subs = first_st.get("sub_stages") or []
            if raw_subs and isinstance(raw_subs, list):
                sub_labels_raw = [
                    s.get("display", s) if isinstance(s, dict) else str(s)
                    for s in raw_subs
                ]

        sub_stages = []
        for j, sl in enumerate(sub_labels_raw):
            if isinstance(sl, str):
                sub_stages.append({"key": f"sub_{i}_{j}", "name": sl.strip()})
            elif isinstance(sl, dict):
                sub_stages.append({
                    "key": str(sl.get("key", f"sub_{i}_{j}")),
                    "name": str(sl.get("name", sl.get("display", ""))),
                })

        stage_style = "early_mid_late" if sub_stages else "none"

        is_primary = bool(ax.get("is_primary", False)) and not has_primary
        if is_primary:
            has_primary = True

        stages_raw = ax.get("stages") or []
        stages = []
        for j, st in enumerate(stages_raw):
            if not isinstance(st, dict):
                continue
            stage_sub_raw = st.get("sub_stages") or []
            stage_subs = []
            if stage_sub_raw:
                for k, ss in enumerate(stage_sub_raw):
                    if isinstance(ss, str):
                        stage_subs.append({"key": f"sub_{j}_{k}", "name": ss.strip()})
                    elif isinstance(ss, dict):
                        raw_ss_name = str(ss.get("name", ss.get("display", ss.get("key", "")))).strip()
                        stage_subs.append({
                            "key": str(ss.get("key", f"sub_{j}_{k}")),
                            "name": raw_ss_name if raw_ss_name else _slug_to_display(str(ss.get("key", ""))),
                        })
                stage_style = "early_mid_late"
            elif sub_stages:
                stage_subs = [{"key": s["key"], "name": s.get("name", s.get("display", ""))} for s in sub_stages]
                stage_style = "early_mid_late"
            else:
                stage_subs = []
                stage_style = "none"

            # Stage display: prefer explicit display, fallback to name, then slug-to-display
            raw_stage_name = str(st.get("name", f"stage_{j}")).strip()
            raw_stage_display = str(st.get("display", "") or raw_stage_name).strip()
            final_display = _slug_to_display(raw_stage_display) if raw_stage_display else f"Stage {j+1}"

            stages.append({
                "name": final_display,
                "slug": raw_stage_name.lower().replace(" ", "_"),
                "order": st.get("order", j + 1),
                "stage_style": st.get("stage_style", stage_style),
                "sub_stages": stage_subs,
                "weight": st.get("weight", 1.0),
            })

        axes.append({
            "axis_id": str(ax.get("axis_id", slugify(ax.get("axis_name", f"axis_{i}")))),
            "axis_name": str(ax.get("axis_name", f"Axis {i+1}")),
            "axis_type": str(ax.get("axis_type", "cultivation")),
            "is_primary": is_primary,
            "description": str(ax.get("description", "")),
            "stages": stages,
            "display_scale": ax.get("display_scale", 10),
            "normalization_max": ax.get("normalization_max", 100),
            "visible": ax.get("visible", True),
            "weight": ax.get("weight", 1.0),
        })

    if axes and not any(a.get("is_primary") for a in axes):
        axes[0]["is_primary"] = True

    return {
        "power_system_name": system_name,
        "axes": axes,
    }


# ---------------------------------------------------------------------------
# Expander
# ---------------------------------------------------------------------------

class ScenarioExpander:
    def __init__(self, llm):
        self._llm = llm

    async def expand(
        self,
        title: str = "",
        description: str = "",
        tone_instructions: str = "",
        opening_narrative: str = "",
        lore_text: str = "",
        language: str = "en",
        genre_id: str | None = None,
    ) -> dict:
        effective_lang = language if language in ("vi", "en") else (
            "vi" if sum(1 for c in f"{title} {description}"
                        if "\u00c0" <= c <= "\u1ef3") > 3 else "en"
        )

        system_prompt = _build_system_prompt(
            effective_lang, genre_id, title, description, lore_text
        )
        user_message = _build_user_message(title, description, effective_lang)

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ]

        try:
            raw = await self._llm.complete(messages=messages, max_tokens=8192)
        except Exception:
            logger.exception("Scenario expansion failed")
            return _empty_result()

        result = parse_json_dict(raw)
        if result is None:
            logger.warning("Scenario expander returned unparseable response: %s", raw[:200])
            return _empty_result()

        ps_raw = result.get("power_system")
        if ps_raw and isinstance(ps_raw, dict) and ps_raw.get("axes"):
            power_system = _normalize_power_system(ps_raw)
        else:
            power_system = {}

        raw_entities = result.get("entities") or []
        entities = []
        if isinstance(raw_entities, list):
            for raw_ent in raw_entities:
                if isinstance(raw_ent, dict):
                    norm = _normalize_entity(raw_ent)
                    if norm and norm["type"] != "rank":
                        entities.append(norm)

        return {
            "suggestions": {
                "title": str(result.get("title", title)),
                "description": str(result.get("description", description)),
                "protagonist_name": str(result.get("protagonist_name", "")),
                "narrative_pov": str(result.get("narrative_pov", "first_person")),
                "writing_style": str(result.get("writing_style", "chinh_thong")),
                "tone_instructions": str(result.get("tone_instructions", "")),
                "opening_narrative": str(result.get("opening_narrative", "")),
                "lore_text": str(result.get("lore_text", "")),
            },
            "entities": entities,
            "power_system": power_system,
            "based_on": ["title", "description", "genre_id"],
            "detected_genres": [genre_id] if genre_id else [],
        }


def _empty_result() -> dict:
    return {
        "suggestions": {
            "title": "", "description": "",
            "protagonist_name": "", "narrative_pov": "first_person",
            "writing_style": "chinh_thong",
            "tone_instructions": "", "opening_narrative": "", "lore_text": "",
        },
        "entities": [],
        "power_system": {},
        "based_on": [],
        "detected_genres": [],
    }
