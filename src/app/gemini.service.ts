import { Injectable, inject } from '@angular/core';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { ClusterService } from './cluster.service';
import { Prompt, StackOverflowTicket } from './models';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private ai: GoogleGenAI;
  private clusterService = inject(ClusterService);

  constructor() {
    // Initialize Gemini API
    this.ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }

  async categorizeDomainsDetailed(domains: string[]): Promise<Record<string, {category: string, cluster: string, subcluster: string}>> {
    if (!domains || domains.length === 0) return {};

    const groups = this.clusterService.mainGroups();
    const groupContext = groups.map(g => {
      const subs = g.subGroups.map(s => s.name).join(', ');
      return `- ${g.name}: [${subs}]`;
    }).join('\n');

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Kategorisiere die folgenden Domains. Gib ein JSON-Objekt zurück, bei dem der Schlüssel die Domain ist und der Wert ein Objekt mit 'category', 'cluster' und 'subcluster'.\n\nNutze bevorzugt diese Hauptgruppen (cluster) und Subgruppen (subcluster):\n${groupContext}\n\nWenn keine passt, wähle die am nächsten liegende oder erstelle eine neue sinnvolle.\n\nDomains:\n${domains.join('\n')}`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            description: "Mapping of domains to detailed categories",
            additionalProperties: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING },
                cluster: { type: Type.STRING },
                subcluster: { type: Type.STRING }
              }
            }
          }
        }
      });

      const text = response.text;
      if (text) {
        return JSON.parse(text);
      }
    } catch (error) {
      console.error('Error categorizing domains:', error);
    }
    return {};
  }

  async categorizeDomains(domains: string[]): Promise<Record<string, string>> {
    if (!domains || domains.length === 0) return {};

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Kategorisiere die folgenden Domains in sinnvolle Hauptbegriffe (z.B. "Nachrichten", "Social Media", "Arbeit", "Shopping", "Technologie", "Unterhaltung"). Gib ein JSON-Objekt zurück, bei dem der Schlüssel die Domain und der Wert die Kategorie ist.\n\nDomains:\n${domains.join('\n')}`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            description: "Mapping of domains to categories",
            additionalProperties: {
              type: Type.STRING
            }
          }
        }
      });

      const text = response.text;
      if (text) {
        return JSON.parse(text);
      }
    } catch (error) {
      console.error('Error categorizing domains:', error);
    }
    return {};
  }

  async generateDocumentSummary(title: string): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generiere eine kurze, plausible Zusammenfassung (max 3 Sätze) für ein fiktives Dokument mit dem Titel "${title}". Beschreibe, worum es in diesem Dokument typically gehen könnte.`,
        config: { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
      });
      return response.text || 'Keine Zusammenfassung generiert.';
    } catch (e) {
      console.error(e);
      return 'Fehler bei der KI-Analyse.';
    }
  }

  async generateText(prompt: string): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
      });
      return response.text || 'Keine Antwort generiert.';
    } catch (e) {
      console.error(e);
      return 'Fehler bei der KI-Generierung.';
    }
  }

  async analyzeImageMetadata(title: string, imageUrl?: string): Promise<{description: string, tags: string[]}> {
    if (imageUrl) {
      try {
        const base64Data = await this.fetchImageAsBase64(imageUrl);
        const response = await this.ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: [
            { text: `Analysiere dieses Bild (Titel: "${title}"). Gib ein JSON-Objekt mit einer kurzen "description" (1-2 Sätze) und einem Array von 3-5 passenden "tags" zurück.` },
            { inlineData: { data: base64Data, mimeType: 'image/jpeg' } }
          ],
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["description", "tags"]
            }
          }
        });
        if (response.text) return JSON.parse(response.text);
      } catch (e) {
        console.warn('Real image analysis failed, falling back to title-based analysis:', e);
      }
    }
    
    const result = await this.batchAnalyzeImageMetadata([title]);
    return result[title] || { description: 'Fehler bei der Analyse', tags: [] };
  }

  async extractTextFromImage(imageUrl: string): Promise<string> {
    try {
      const base64Data = await this.fetchImageAsBase64(imageUrl);
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          { text: "Extrahiere den gesamten Text aus diesem Bild. Gib nur den extrahierten Text zurück, ohne Kommentare oder Formatierungen, es sei denn, sie sind Teil des Textes im Bild. Wenn kein Text gefunden wird, antworte mit 'Kein Text gefunden'." },
          { inlineData: { data: base64Data, mimeType: 'image/jpeg' } }
        ],
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
        }
      });
      return response.text || 'Kein Text extrahiert.';
    } catch (e) {
      console.error('OCR failed:', e);
      return 'Fehler bei der Texterkennung.';
    }
  }

  private async fetchImageAsBase64(url: string): Promise<string> {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async batchAnalyzeImageMetadata(titles: string[]): Promise<Record<string, {description: string, tags: string[]}>> {
    if (!titles || titles.length === 0) return {};
    
    const CHUNK_SIZE = 20;
    const chunks: string[][] = [];
    for (let i = 0; i < titles.length; i += CHUNK_SIZE) {
      chunks.push(titles.slice(i, i + CHUNK_SIZE));
    }

    const allResults: Record<string, {description: string, tags: string[]}> = {};
    
    const chunkPromises = chunks.map(async (chunk) => {
      try {
        const response = await this.ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Analysiere die folgenden fiktiven Bilder basierend auf ihren Titeln. Gib ein JSON-Objekt zurück mit einem Array "results". Jedes Element im Array soll den "title", eine kurze "description" (1-2 Sätze) und ein Array von 3-5 passenden "tags" enthalten.\n\nBilder:\n${chunk.join('\n')}`,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                results: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      description: { type: Type.STRING },
                      tags: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["title", "description", "tags"]
                  }
                }
              },
              required: ["results"]
            }
          }
        });
        
        if (response.text) {
          const data = JSON.parse(response.text);
          if (data.results && Array.isArray(data.results)) {
            data.results.forEach((res: {title: string, description: string, tags: string[]}) => {
              allResults[res.title] = {
                description: res.description,
                tags: res.tags
              };
            });
          }
        }
      } catch (e) {
        console.error('Error in batch image analysis chunk:', e);
      }
    });

    await Promise.all(chunkPromises);
    
    // Fill in missing results with fallback
    titles.forEach(t => {
      if (!allResults[t]) {
        allResults[t] = { description: 'Analyse fehlgeschlagen', tags: [] };
      }
    });
    
    return allResults;
  }

  async findDuplicates(documents: {id: string, name: string, type: string, size: string}[]): Promise<{originalId: string, duplicateIds: string[], reason: string}[]> {
    if (!documents || documents.length < 2) return [];

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analysiere die folgende Liste von Dokumenten und identifiziere mögliche Duplikate basierend auf Ähnlichkeiten im Namen, Typ und Dateigröße. Gib ein JSON-Array zurück. Jedes Objekt soll die ID des Originals ('originalId'), ein Array der IDs der Duplikate ('duplicateIds') und eine kurze Begründung ('reason') enthalten. Wenn keine Duplikate gefunden werden, gib ein leeres Array zurück.\n\nDokumente:\n${JSON.stringify(documents, null, 2)}`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                originalId: { type: Type.STRING },
                duplicateIds: { 
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                reason: { type: Type.STRING }
              },
              required: ["originalId", "duplicateIds", "reason"]
            }
          }
        }
      });

      const text = response.text;
      if (text) {
        return JSON.parse(text);
      }
    } catch (error) {
      console.error('Error finding duplicates:', error);
    }
    return [];
  }

  async searchKiResources(query: string, resources: {title: string, description: string, category: string}[]): Promise<string[]> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analysiere die folgende Suchanfrage: "${query}". 
        Identifiziere basierend auf dieser Anfrage die relevantesten KI-Ressourcen aus der Liste.
        Gib ein JSON-Array mit den Titeln der relevantesten Ressourcen zurück.
        Wenn keine Ressource passt, gib ein leeres Array zurück.
        
        Ressourcen:
        ${JSON.stringify(resources.map(r => ({ title: r.title, description: r.description, category: r.category })), null, 2)}`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });
      if (response.text) return JSON.parse(response.text);
    } catch (e) {
      console.error('Error in AI search:', e);
    }
    return [];
  }

  async enrichKiToolData(name: string): Promise<{link: string, costs: string, access: string, purpose: string, pros: string[], cons: string[], competitors: string[], euAiAct: boolean, cloudStorage: boolean, customerScore: number, securityLabel: string}> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analysiere das KI-Tool mit dem Namen "${name}". Gib ein JSON-Objekt mit folgenden Feldern zurück:
        - link: Offizielle Website URL
        - costs: Kurze Info zu den Kosten (z.B. "Kostenlos", "Abo ab 20€", "Freemium")
        - access: Einer der Werte ["ja", "nein", "Planung", "in genehmigung", "verboten", "gecancelt"] (Wähle "ja" wenn es allgemein zugänglich ist, sonst schätze basierend auf Bekanntheit)
        - purpose: Kurze Beschreibung des Zwecks (max 2 Sätze)
        - pros: Array von 3 Vorteilen
        - cons: Array von 3 Nachteilen
        - competitors: Array von 3 Wettbewerbern
        - euAiAct: Boolean, ob das Tool voraussichtlich EU AI Act konform ist (Schätzung)
        - cloudStorage: Boolean, ob es sich um ein Cloud-basiertes Tool handelt
        - customerScore: Zahl von 0-100 (Schätzung der Kundenzufriedenheit)
        - securityLabel: Bekannte Sicherheitszertifizierungen (z.B. "ISO 27001", "SOC2" oder "Keine bekannt")`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              link: { type: Type.STRING },
              costs: { type: Type.STRING },
              access: { type: Type.STRING, enum: ["ja", "nein", "Planung", "in genehmigung", "verboten", "gecancelt"] },
              purpose: { type: Type.STRING },
              pros: { type: Type.ARRAY, items: { type: Type.STRING } },
              cons: { type: Type.ARRAY, items: { type: Type.STRING } },
              competitors: { type: Type.ARRAY, items: { type: Type.STRING } },
              euAiAct: { type: Type.BOOLEAN },
              cloudStorage: { type: Type.BOOLEAN },
              customerScore: { type: Type.NUMBER },
              securityLabel: { type: Type.STRING }
            },
            required: ["link", "costs", "access", "purpose", "pros", "cons", "competitors", "euAiAct", "cloudStorage", "customerScore", "securityLabel"]
          }
        }
      });
      if (response.text) return JSON.parse(response.text);
    } catch (e) {
      console.error('Error enriching KI tool data:', e);
    }
    return {
      link: '',
      costs: 'Unbekannt',
      access: 'nein',
      purpose: 'Keine Daten gefunden',
      pros: [],
      cons: [],
      competitors: [],
      euAiAct: false,
      cloudStorage: true,
      customerScore: 0,
      securityLabel: 'Unbekannt'
    };
  }

  async searchPrompts(query: string, prompts: Prompt[]): Promise<string[]> {
    const prompt = `
      Du bist ein KI-Assistent für eine Prompt-Galerie.
      Der Benutzer sucht nach: "${query}"
      Hier ist die Liste der verfügbaren Prompts:
      ${prompts.map(p => `- ${p.title}: ${p.description}`).join('\n')}

      Gib NUR ein JSON-Array mit den TITELN der relevantesten Prompts zurück.
      Beispiel: ["Titel 1", "Titel 2"]
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });

      return JSON.parse(response.text || '[]');
    } catch (error) {
      console.error('Error searching prompts:', error);
      return [];
    }
  }

  async searchTickets(query: string, tickets: StackOverflowTicket[]): Promise<string[]> {
    const prompt = `
      Du bist ein KI-Assistent für ein StackOverflow-ähnliches Q&A-System.
      Der Benutzer sucht nach: "${query}"
      Hier ist die Liste der verfügbaren Fragen:
      ${tickets.map(t => `- ${t.title}: ${t.question}`).join('\n')}

      Gib NUR ein JSON-Array mit den TITELN der relevantesten Fragen zurück.
      Beispiel: ["Frage 1", "Frage 2"]
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });

      return JSON.parse(response.text || '[]');
    } catch (error) {
      console.error('Error searching tickets:', error);
      return [];
    }
  }

  async generateSeedPrompts(category: string, count: number): Promise<Partial<Prompt>[]> {
    const prompt = `Generiere ${count} verschiedene KI-Prompts für die Kategorie "${category}". 
    Jeder Prompt sollte einen Titel, eine kurze Beschreibung, einen langen Text (den eigentlichen Prompt) und eine ausführliche Erklärung (longDescription) haben.
    Gib ein JSON-Array von Objekten zurück.`;
    
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                content: { type: Type.STRING },
                longDescription: { type: Type.STRING }
              },
              required: ["title", "description", "content", "longDescription"]
            }
          }
        }
      });
      return JSON.parse(response.text || '[]');
    } catch (e) {
      console.error('Error generating seed prompts:', e);
      return [];
    }
  }

  async generateSeedTickets(category: string, count: number): Promise<Partial<StackOverflowTicket>[]> {
    const prompt = `Generiere ${count} verschiedene StackOverflow-ähnliche Q&A Einträge für die KI-Kategorie "${category}". 
    Jeder Eintrag sollte einen Titel, eine Frage, eine hilfreiche Antwort, eine kurze Beschreibung und eine ausführliche Erklärung (longDescription) haben.
    Gib ein JSON-Array von Objekten zurück.`;
    
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                question: { type: Type.STRING },
                answer: { type: Type.STRING },
                description: { type: Type.STRING },
                longDescription: { type: Type.STRING }
              },
              required: ["title", "question", "answer", "description", "longDescription"]
            }
          }
        }
      });
      return JSON.parse(response.text || '[]');
    } catch (e) {
      console.error('Error generating seed tickets:', e);
      return [];
    }
  }

  async suggestCategory(content: string, categories: string[]): Promise<string> {
    const prompt = `Analysiere den folgenden KI-Prompt und ordne ihn einer der folgenden Kategorien zu: ${categories.join(', ')}.
    Gib NUR den Namen der am besten passenden Kategorie zurück.
    
    Prompt:
    "${content}"`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
        }
      });
      const suggested = response.text?.trim() || '';
      // Ensure the suggested category is one of the allowed ones
      const matched = categories.find(c => c.toLowerCase() === suggested.toLowerCase());
      return matched || categories[0];
    } catch (error) {
      console.error('Error suggesting category:', error);
      return categories[0];
    }
  }
}

