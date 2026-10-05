export const DEFAULT_RESTAURANT_SLUG =
  process.env.NEXT_PUBLIC_DEFAULT_RESTAURANT_SLUG ||
  process.env.DEFAULT_RESTAURANT_SLUG ||
  "kyoto-shabu";

export interface MenuItem {
  name: string;
  description?: string;
  price: number;
  badge?: string;
}

export interface MenuSection {
  title: string;
  subtitle: string;
  items: MenuItem[];
}

export interface NewsItem {
  id: string;
  date: string;
  category: "お知らせ" | "季節限定" | "営業案内";
  title: string;
  content?: string;
}

export interface TableConfig {
  name: string;
  type: string;
  capacity: number;
}

export interface MealPeriod {
  name: "lunch" | "dinner";
  label: string; // e.g. "ランチ", "ディナー"
  openTime: string; // HH:mm
  closeTime: string; // HH:mm
  isOvernight?: boolean;
}

export function generateSlotsFromPeriod(
  period: Pick<MealPeriod, "openTime" | "closeTime" | "isOvernight">,
  intervalMinutes: number,
  durationMinutes: number,
): string[] {
  const [openH, openM] = period.openTime.split(":").map(Number);
  const [closeH, closeM] = period.closeTime.split(":").map(Number);

  const startMinutes = openH * 60 + openM;
  const endMinutes = (period.isOvernight ? closeH + 24 : closeH) * 60 + closeM;
  const lastPossibleStart = endMinutes - durationMinutes;

  const slots: string[] = [];
  for (let current = startMinutes; current <= lastPossibleStart; current += intervalMinutes) {
    const totalHours = Math.floor(current / 60) % 24;
    const mins = current % 60;
    const hh = String(totalHours).padStart(2, "0");
    const mm = String(mins).padStart(2, "0");
    slots.push(`${hh}:${mm}`);
  }
  return slots;
}

export interface RestaurantConfig {
  name: string;
  nameKana: string;
  nameEn: string;
  tagline: string;
  summary: string;
  totalSeats: number;
  tables: TableConfig[];
  hero: {
    title: string;
    subtitle: string;
    backgroundImage: string;
  };
  about: {
    heading: string;
    subheading: string;
    description: string[];
    features: {
      title: string;
      description: string;
      image?: string;
    }[];
  };
  menu: {
    note: string;
    sections: MenuSection[];
  };
  businessHours: {
    periods: MealPeriod[];
    lunch: string;
    dinner: string;
    closedDays: string;
    closedDaysOfWeek?: number[];
    note?: string;
  };
  contact: {
    phone: string;
    phoneDisplay: string;
    email: string;
    postalCode: string;
    address: string;
    social?: {
      instagram?: string;
      facebook?: string;
    };
  };
  access: {
    station: {
      name: string;
      description: string;
    }[];
    parking: {
      car: string;
      bicycle: string;
    };
    googleMapsEmbedUrl: string;
  };
  reservation: {
    url: string;
    note: string;
  };
  booking: {
    maxAdvanceDays: number;
    minAdvanceHours: number;
    cancellationCutoffHours: number;
    noShowGracePeriodMinutes?: number;
    defaultDurationMinutes: number;
    slotIntervalMinutes: number;
    minPartySize: number;
    maxPartySize: number;
    partySizes: number[];
    lunchSlots: string[];
    dinnerSlots: string[];
  };
  news: NewsItem[];
}

export const restaurantConfig: RestaurantConfig = {
  name: "京都しゃぶしゃぶ",
  nameKana: "きょうとしゃぶしゃぶ",
  nameEn: "Kyoto Shabu-Shabu",
  tagline: "厳選肉と季節の野菜を、こだわりの特製出汁で。",
  summary: "京都市役所前駅徒歩1分。しゃぶしゃぶ専門店です。",
  totalSeats: 30,
  tables: [
    { name: "T-01", type: "テーブル席", capacity: 2 },
    { name: "T-02", type: "窓際テーブル席", capacity: 2 },
    { name: "T-03", type: "テーブル席", capacity: 4 },
    { name: "T-04", type: "テーブル席", capacity: 4 },
    { name: "T-05", type: "窓際テーブル席", capacity: 4 },
    { name: "T-06", type: "半個室", capacity: 6 },
    { name: "T-07", type: "半個室", capacity: 8 },
  ],

  hero: {
    title: "京都しゃぶしゃぶ",
    subtitle: "こだわりの特製出汁と厳選肉で楽しむしゃぶしゃぶ。",
    backgroundImage: "/images/restaurant/shabu-hero.jpg",
  },

  about: {
    heading: "当店について",
    subheading: "出汁と厳選素材で味わうひととき",
    description: ["毎朝店内で丁寧に仕込む特製出汁と、厳選された牛肉・豚肉をお楽しみいただけます。"],
    features: [
      {
        title: "こだわりの特製出汁",
        description: "昆布と鰹をベースに、毎朝店内で仕込む風味豊かな合わせ出汁です。",
        image: "/images/restaurant/shabu-dashi.jpg",
      },
      {
        title: "厳選した牛肉・豚肉",
        description: "しゃぶしゃぶに最適な薄切り肉をご注文ごとにご用意いたします。",
        image: "/images/restaurant/shabu-beef.jpg",
      },
      {
        title: "全30席の落ち着いた空間",
        description:
          "木目を基調としたテーブル席と半個室で、ゆっくりとお食事をお楽しみいただけます。",
        image: "/images/restaurant/shabu-interior.jpg",
      },
    ],
  },

  menu: {
    note: "※ 表示価格はすべて税込です。",
    sections: [
      {
        title: "コース",
        subtitle: "おすすめのしゃぶしゃぶコース",
        items: [
          {
            name: "国産牛しゃぶしゃぶコース",
            description: "厳選牛肉、季節の野菜盛り合わせ、〆のうどん",
            price: 4500,
            badge: "定番",
          },
          {
            name: "国産豚しゃぶしゃぶコース",
            description: "厳選豚肉、季節の野菜盛り合わせ、〆のうどん",
            price: 3500,
          },
          {
            name: "特選 牛・豚しゃぶしゃぶコース",
            description: "牛・豚肉、季節の野菜盛り合わせ、〆のうどん",
            price: 4980,
            badge: "おすすめ",
          },
        ],
      },
      {
        title: "追加具材・単品料理",
        subtitle: "お好みに合わせてお楽しみいただける具材",
        items: [
          { name: "追加 牛肉（100g）", price: 1200 },
          { name: "追加 豚肉（100g）", price: 800 },
          { name: "季節の野菜盛り合わせ", price: 600 },
          { name: "〆のうどん", price: 300 },
          { name: "ご飯", price: 200 },
        ],
      },
      {
        title: "お飲み物",
        subtitle: "ビール・ソフトドリンク",
        items: [
          { name: "生ビール", price: 600 },
          { name: "ハイボール", price: 500 },
          { name: "ウーロン茶", price: 350 },
          { name: "オレンジジュース", price: 350 },
        ],
      },
    ],
  },

  businessHours: {
    periods: [
      {
        name: "lunch",
        label: "ランチ",
        openTime: "11:30",
        closeTime: "14:30",
        isOvernight: false,
      },
      {
        name: "dinner",
        label: "ディナー",
        openTime: "17:30",
        closeTime: "02:00",
        isOvernight: true,
      },
    ],
    lunch: "11:30 ～ 14:30",
    dinner: "17:30 ～ 翌02:00",
    closedDays: "月曜定休",
    closedDaysOfWeek: [1],
    note: "完全予約制です。",
  },

  contact: {
    phone: "075-222-3111",
    phoneDisplay: "075-222-3111",
    email: "info@example.com",
    postalCode: "〒604-8571",
    address: "京都府京都市中京区寺町通御池上る上本能寺前町488番地（京都市役所前）",
    social: {
      instagram: "https://instagram.com",
      facebook: "https://facebook.com",
    },
  },

  access: {
    station: [
      {
        name: "地下鉄東西線「京都市役所前駅」",
        description: "ゼスト御池直結・徒歩1分",
      },
      {
        name: "京都市バス「京都市役所前」",
        description: "徒歩1分",
      },
      {
        name: "京阪本線「三条駅」",
        description: "徒歩8分",
      },
    ],
    parking: {
      car: "専用駐車場なし（近隣コインパーキングをご利用ください）",
      bicycle: "市役所前公共駐輪場をご利用ください",
    },
    googleMapsEmbedUrl:
      "https://www.google.com/maps?q=35.011636,135.768114&hl=ja&z=16&output=embed",
  },

  reservation: {
    url: "/reserve",
    note: "24時間WEB予約を受け付けております。",
  },

  booking: {
    maxAdvanceDays: 30,
    minAdvanceHours: 2,
    cancellationCutoffHours: 1,
    noShowGracePeriodMinutes: 15,
    defaultDurationMinutes: 90,
    slotIntervalMinutes: 30,
    minPartySize: 1,
    maxPartySize: 8,
    partySizes: [1, 2, 3, 4, 5, 6, 7, 8],
    lunchSlots: generateSlotsFromPeriod(
      { openTime: "11:30", closeTime: "14:30", isOvernight: false },
      30,
      90,
    ),
    dinnerSlots: generateSlotsFromPeriod(
      { openTime: "17:30", closeTime: "02:00", isOvernight: true },
      30,
      90,
    ),
  },

  news: [
    {
      id: "news-3",
      date: "2026.09.20",
      category: "季節限定",
      title: "季節の野菜しゃぶしゃぶのご案内",
      content: "旬の野菜を取り入れた特別メニューをご用意しております。",
    },
    {
      id: "news-2",
      date: "2026.09.10",
      category: "営業案内",
      title: "定休日および祝日営業のお知らせ",
      content: "月曜日が祝日の場合は通常営業し、翌火曜日を振替休業といたします。",
    },
    {
      id: "news-1",
      date: "2026.08.15",
      category: "お知らせ",
      title: "WEB予約を開始しました",
      content: "スマートフォンやPCから24時間いつでも空席確認・ご予約いただけます。",
    },
  ],
};
