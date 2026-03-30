import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Activity, Document } from './models';
import * as Papa from 'papaparse';
import * as mammoth from 'mammoth';
import { GeminiService } from './gemini.service';
import { ToastService } from './toast.service';
import { DocumentService } from './document.service';

@Injectable({
  providedIn: 'root'
})
export class ActivityService {
  activities = signal<Activity[]>([]);
  isLoading = signal<boolean>(false);
  loadingProgress = signal<string>('');
  
  categories = computed(() => {
    const cats = new Set(this.activities().map(a => a.category));
    return Array.from(cats).sort();
  });

  private toastService = inject(ToastService);
  private documentService = inject(DocumentService);
  private platformId = inject(PLATFORM_ID);

  private geminiService = inject(GeminiService);

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const stored = localStorage.getItem('activities_db_v2');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert string dates back to Date objects
        const activities = parsed.map((a: Activity) => ({
          ...a,
          date: new Date(a.date)
        }));
        this.activities.set(activities);
      }
    } catch (e) {
      console.error('Failed to load activities from storage', e);
    }
  }

  private saveToStorage(activities: Activity[]) {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.setItem('activities_db_v2', JSON.stringify(activities));
    } catch (e) {
      console.error('Failed to save activities to storage', e);
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        this.toastService.show('Warnung: Der lokale Speicher ist voll. Einige Daten können möglicherweise nicht gespeichert werden.', 'error');
      }
    }
  }

  async processFile(file: File) {
    this.isLoading.set(true);
    this.loadingProgress.set('Hochladen...');
    try {
      let text = '';
      if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      } else {
        text = await file.text();
      }

      let extractedActivities: Partial<Activity>[] = [];

      if (file.name.endsWith('.json')) {
        extractedActivities = this.parseJson(text);
      } else if (file.name.endsWith('.csv')) {
        extractedActivities = this.parseCsv(text);
      } else {
        extractedActivities = this.extractUrlsFromText(text);
      }

      await this.processExtractedActivities(extractedActivities, file.name, file.size);

    } catch (error) {
      console.error('Error processing file:', error);
      this.toastService.show('Fehler beim Verarbeiten der Datei.', 'error');
      this.isLoading.set(false);
      this.loadingProgress.set('');
    }
  }

  async processText(text: string) {
    this.isLoading.set(true);
    this.loadingProgress.set('Analysiere Text...');
    try {
      const extractedActivities = this.extractUrlsFromText(text);
      await this.processExtractedActivities(extractedActivities, 'Eingefügter Text', new Blob([text]).size);
    } catch (error) {
      console.error('Error processing text:', error);
      this.toastService.show('Fehler beim Verarbeiten des Textes.', 'error');
      this.isLoading.set(false);
      this.loadingProgress.set('');
    }
  }

  private async processExtractedActivities(extractedActivities: Partial<Activity>[], sourceName: string, sourceSize: number) {
    // Deduplicate and clean up
    const existingUrls = new Set(this.activities().map(a => a.url));
    
    const validActivities = extractedActivities
      .map(a => {
        const mainUrl = this.extractMainUrl(a.url || '');
        return { ...a, url: mainUrl };
      })
      .filter(a => a.url && a.url.startsWith('http') && !existingUrls.has(a.url))
      .map(a => {
        let domain = '';
        try {
          domain = new URL(a.url!).hostname;
        } catch {
          // ignore
        }
        
        return {
          id: Math.random().toString(36).substring(2, 9),
          url: a.url!,
          domain: domain,
          date: a.date || new Date(),
          title: a.title || domain,
          category: 'Unkategorisiert',
          cluster: 'Sonstiges',
          subcluster: 'Allgemein',
          priority: 'Niedrig' as const,
          notes: '',
          screenshots: [
            `https://image.thum.io/get/width/600/crop/800/${a.url}`,
            `https://image.thum.io/get/width/600/crop/800/zoom/50/${a.url}`,
            `https://image.thum.io/get/width/600/crop/800/zoom/150/${a.url}`
          ]
        };
      });

    if (validActivities.length === 0) {
      this.toastService.show('Keine neuen, gültigen URLs gefunden (möglicherweise Duplikate).', 'info');
      this.isLoading.set(false);
      this.loadingProgress.set('');
      return;
    }

    // Get unique domains for categorization
    const uniqueDomains = Array.from(new Set(validActivities.map(a => a.domain).filter(d => d)));
    
    // Categorize in batches if too many
    const categoriesMap: Record<string, {category: string, cluster: string, subcluster: string}> = {};
    const batchSize = 50;
    for (let i = 0; i < uniqueDomains.length; i += batchSize) {
      this.loadingProgress.set(`Analysieren... (${Math.min(i + batchSize, uniqueDomains.length)} von ${uniqueDomains.length} Domains)`);
      const batch = uniqueDomains.slice(i, i + batchSize);
      const batchCategories = await this.geminiService.categorizeDomainsDetailed(batch);
      Object.assign(categoriesMap, batchCategories);
    }
    this.loadingProgress.set('Dashboard erstellt');

    // Apply categories
    const finalActivities = validActivities.map(a => {
      const catData = categoriesMap[a.domain];
      return {
        ...a,
        category: catData?.category || 'Sonstiges',
        cluster: catData?.cluster || 'Unbekannt',
        subcluster: catData?.subcluster || 'Allgemein'
      };
    });

    // Merge with existing and sort by date descending
    const allActivities = [...this.activities(), ...finalActivities];
    allActivities.sort((a, b) => b.date.getTime() - a.date.getTime());

    this.activities.set(allActivities);
    this.saveToStorage(allActivities);
    this.toastService.show(`${finalActivities.length} neue Aktivitäten erfolgreich importiert und kategorisiert!`, 'success');

    // Add the uploaded file to the Document Archive
    const fileExt = sourceName.split('.').pop()?.toUpperCase() || 'UNKNOWN';
    let docType = 'Text';
    if (fileExt === 'JSON') docType = 'JSON';
    else if (fileExt === 'CSV') docType = 'CSV';
    else if (fileExt === 'HTML') docType = 'HTML';
    else if (fileExt === 'DOCX' || fileExt === 'DOC') docType = 'Word';

    const newDoc: Document = {
      id: Math.random().toString(36).substring(2, 9),
      name: sourceName,
      type: docType,
      size: (sourceSize / 1024).toFixed(1) + ' KB',
      date: new Date(),
      tags: ['Import', fileExt],
      priority: 'Mittel',
      activity: 'Aktivitäten Import',
      cluster: 'Datenverwaltung',
      subcluster: 'Import',
      url: '' // No URL for local files yet
    };
    this.documentService.addDocument(newDoc);
    
    // Keep the "Dashboard erstellt" message visible for a short time
    setTimeout(() => {
      this.isLoading.set(false);
      this.loadingProgress.set('');
    }, 1500);
  }

  updateActivity(id: string, updates: Partial<Activity>) {
    this.activities.update(acts => {
      const newActs = acts.map(a => a.id === id ? { ...a, ...updates } : a);
      this.saveToStorage(newActs);
      return newActs;
    });
  }

  deleteActivity(id: string) {
    this.activities.update(acts => {
      const newActs = acts.filter(a => a.id !== id);
      this.saveToStorage(newActs);
      return newActs;
    });
    this.toastService.show('Aktivität wurde gelöscht.', 'success');
  }

  clearActivities() {
    this.activities.set([]);
    this.saveToStorage([]);
  }

  private extractMainUrl(rawUrl: string): string | null {
    if (!rawUrl) return null;
    try {
      let urlObj = new URL(rawUrl);
      
      // Handle Google Redirects (e.g. Google Takeout)
      if (urlObj.hostname.includes('google.') && urlObj.pathname === '/url') {
        const target = urlObj.searchParams.get('q') || urlObj.searchParams.get('url');
        if (target) {
          urlObj = new URL(target);
        }
      }

      // Filter out search engines and generic noise
      const noiseDomains = [
        'www.google.de', 'www.google.com', 'google.de', 'google.com',
        'myactivity.google.com', 'accounts.google.com', 'mail.google.com',
        'bing.com', 'www.bing.com', 'search.yahoo.com', 'duckduckgo.com'
      ];
      
      if (noiseDomains.includes(urlObj.hostname)) {
        return null; // Delete these entries
      }

      // Optional: Strip query parameters to get the clean "Main URL"
      // urlObj.search = '';
      // urlObj.hash = '';

      return urlObj.toString();
    } catch {
      return null;
    }
  }

  private parseJson(text: string): Partial<Activity>[] {
    try {
      const data = JSON.parse(text);
      if (Array.isArray(data)) {
        return data.map(item => ({
          url: item.titleUrl || item.url,
          title: item.title,
          date: item.time ? new Date(item.time) : new Date()
        }));
      }
    } catch (e) {
      console.error('JSON parse error', e);
    }
    return this.extractUrlsFromText(text);
  }

  private parseCsv(text: string): Partial<Activity>[] {
    const result = Papa.parse(text, { header: true, skipEmptyLines: true });
    return (result.data as Record<string, string>[]).map((row) => {
      // Try to find URL and Date columns
      const urlKey = Object.keys(row).find(k => k.toLowerCase().includes('url') || k.toLowerCase().includes('link'));
      const dateKey = Object.keys(row).find(k => k.toLowerCase().includes('date') || k.toLowerCase().includes('time') || k.toLowerCase().includes('zeit'));
      const titleKey = Object.keys(row).find(k => k.toLowerCase().includes('title') || k.toLowerCase().includes('titel'));
      
      return {
        url: urlKey ? row[urlKey] : Object.values(row)[0] as string,
        title: titleKey ? row[titleKey] : '',
        date: dateKey ? new Date(row[dateKey]) : new Date()
      };
    });
  }

  private extractUrlsFromText(text: string): Partial<Activity>[] {
    const urlRegex = /(https?:\/\/[^\s"'<>]+)/g;
    const urls = text.match(urlRegex) || [];
    return urls.map(url => ({
      url,
      date: new Date()
    }));
  }
}
