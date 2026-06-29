export interface MayorScore {
  overall: number;
  infrastructure: number;
  social: number;
  traffic: number;
  transparency: number;
}

export interface Mayor {
  id: string;
  city: string;
  name: string;
  party: string;
  imageUrl?: string;
  score: MayorScore;
  totalVotes: number;
}

export interface Rating {
  infrastructure: number;
  social: number;
  traffic: number;
  transparency: number;
  review?: string;
}

export interface NewsSource {
  uri: string;
  title: string;
}
