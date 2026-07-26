export interface Charm {
  id: number | string;
  name: string;
  category: string;
  price: number;
  image: string;
  stock?: number;
  limited?: boolean;
  discount?: {
    enabled: boolean;
    value: number;
    startAt?: string;
    endAt?: string;
  };
}
