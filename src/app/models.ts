export interface Activity {
  id: string;
  url: string;
  domain: string;
  date: Date;
  title: string;
  category: string;
  cluster: string;
  subcluster: string;
  priority: 'Hoch' | 'Mittel' | 'Niedrig';
  notes: string;
  screenshots: string[];
}

export interface Document {
  id: string;
  name: string;
  type: string;
  size: string;
  date: Date;
  tags: string[];
  priority: 'Hoch' | 'Mittel' | 'Niedrig';
  activity: string;
  cluster: string;
  subcluster: string;
  url: string;
}

export interface ImageMetadata {
  id: string;
  uid: string;
  url: string;
  title: string;
  tags: string[];
  priority: 'Hoch' | 'Mittel' | 'Niedrig';
  activity: string;
  cluster: string;
  subcluster: string;
  date: unknown;
  size: string;
  sourcePath?: string;
  description?: string;
  selected?: boolean;
}

export interface KiResource {
  id: string;
  uid: string;
  title: string;
  description: string;
  longDescription?: string;
  link: string;
  category: 'Learning' | 'News' | 'Directory' | 'Community';
  screenshots: string[];
  date: string;
}

export interface KiTool {
  id: string;
  uid: string;
  name: string;
  link: string;
  costs: string;
  access: 'ja' | 'nein' | 'Planung' | 'in genehmigung' | 'verboten' | 'gecancelt';
  purpose: string;
  category: string;
  privateComment?: string;
  pros: string[];
  cons: string[];
  competitors: string[];
  euAiAct?: boolean;
  cloudStorage?: boolean;
  customerScore?: number;
  securityLabel?: string;
  date: string;
}

export interface Prompt {
  id: string;
  uid: string;
  title: string;
  category: string;
  content: string;
  description: string;
  longDescription?: string;
  screenshots: string[];
  date: string;
}

export interface StackOverflowTicket {
  id: string;
  uid: string;
  title: string;
  category: string;
  question: string;
  answer: string;
  description: string;
  longDescription?: string;
  screenshots: string[];
  date: string;
  votes: number;
  author: string;
  tags: string[];
}

export interface TodoTask {
  id: string;
  uid: string;
  taskNumber: string;
  title: string;
  description: string;
  status: 'To Do' | 'In Progress' | 'Review' | 'Done';
  priority: 'Hoch' | 'Mittel' | 'Niedrig';
  date: string;
  dueDate?: string;
  tags: string[];
  creatorName: string;
  kiCategory?: string;
  kiToolId?: string;
  muralPosition?: { x: number, y: number };
}

export interface AiSkill {
  id: string;
  uid: string;
  name: string;
  type: 'Skill' | 'Agent' | 'Plugin' | 'MCP' | 'API';
  toolId?: string; // Reference to KiTool
  description: string;
  link?: string;
  tags: string[];
  date: string;
}

export interface Presentation {
  id: string;
  uid: string;
  title: string;
  type: 'pdf' | 'ppt' | 'word';
  category: string;
  tags: string[];
  date: Date;
  size: string;
  fileUrl: string;
  storagePath: string;
}

