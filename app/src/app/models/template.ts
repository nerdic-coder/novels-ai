export interface PromptTemplate {
  id: string;
  name: string;
  title: string;
  genre: string;
  style: string;
  plot: string;
  location: string;
  pov: string;
  selectedVoice: string;
  characters: Array<{
    name: string;
    description: string;
    link?: string;
    image?: string;
    aiProfile?: string;
  }>;
  uid: string;
  updatedAt: Date;
}
