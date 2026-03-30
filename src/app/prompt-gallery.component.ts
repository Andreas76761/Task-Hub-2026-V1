import { ChangeDetectionStrategy, Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService } from './gemini.service';
import { ToastService } from './toast.service';
import { Prompt } from './models';
import { db, auth, setDoc } from './firebase';
import { collection, onSnapshot, query, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { animate, stagger } from "motion";

@Component({
  selector: 'app-prompt-gallery',
  standalone: true,
  imports: [MatIconModule, CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-4 md:p-8 h-full overflow-y-auto bg-slate-50/50">
      <div class="max-w-7xl mx-auto">
        <!-- Header & Search -->
        <header class="mb-8">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 class="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <mat-icon class="text-indigo-600">auto_awesome_motion</mat-icon>
                Promptgallery
              </h2>
              <p class="text-slate-500 mt-1">Inspirierende Prompts für Ihre tägliche Arbeit mit KI.</p>
            </div>
            <div class="flex items-center gap-2">
              <button 
                (click)="seedData()" 
                [disabled]="isSeeding()"
                class="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm"
              >
                <mat-icon class="text-sm">{{ isSeeding() ? 'hourglass_empty' : 'cloud_upload' }}</mat-icon>
                {{ isSeeding() ? 'Seeding...' : '200 Prompts laden' }}
              </button>
              <button 
                (click)="showAddModal = true"
                class="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-md shadow-indigo-200"
              >
                <mat-icon class="text-sm">add</mat-icon>
                Prompt hinzufügen
              </button>
            </div>
          </div>

          <div class="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-2">
            <div class="flex-1 relative group">
              <mat-icon class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">search</mat-icon>
              <input 
                type="text" 
                [(ngModel)]="searchQuery"
                (input)="onSearchChange()"
                placeholder="Suche nach Prompts oder nutze die KI-Suche..."
                class="w-full pl-12 pr-4 py-3 bg-transparent border-none focus:ring-0 text-slate-700 placeholder:text-slate-400"
                aria-label="Prompt Suche"
              >
            </div>
            <div class="flex items-center gap-2 px-2 border-t md:border-t-0 md:border-l border-slate-100 pt-2 md:pt-0">
              <button 
                (click)="toggleVoiceInput()"
                [class.text-red-500]="isListening"
                [class.bg-red-50]="isListening"
                class="p-2 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-2 text-slate-500"
                title="Spracheingabe"
              >
                <mat-icon>{{ isListening ? 'mic' : 'mic_none' }}</mat-icon>
              </button>
              <button 
                (click)="performAiSearch()"
                [disabled]="!searchQuery || isAiSearching"
                class="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-sm font-semibold hover:bg-indigo-100 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <mat-icon class="text-sm">{{ isAiSearching ? 'hourglass_empty' : 'psychology' }}</mat-icon>
                KI-Suche
              </button>
            </div>
          </div>

          <!-- Categories -->
          <div class="flex flex-wrap gap-2 mt-4">
            @for (cat of categories; track cat) {
              <button 
                (click)="toggleCategory(cat)"
                [class.bg-indigo-600]="selectedCategories.has(cat)"
                [class.text-white]="selectedCategories.has(cat)"
                [class.bg-white]="!selectedCategories.has(cat)"
                [class.text-slate-600]="!selectedCategories.has(cat)"
                class="px-4 py-1.5 rounded-full text-xs font-medium border border-slate-200 transition-all hover:border-indigo-300 shadow-sm"
              >
                {{ cat }}
              </button>
            }
          </div>
        </header>

        <!-- Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="prompt-grid">
          @for (prompt of filteredPrompts(); track prompt.id) {
            <div 
              (dblclick)="openDetail(prompt)"
              class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
            >
              <div class="p-6">
                <div class="flex items-center justify-between mb-4">
                  <span class="px-2.5 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-lg uppercase tracking-wider">
                    {{ prompt.category }}
                  </span>
                  <div class="flex gap-1">
                    <button 
                      (click)="categorizeExistingPrompt(prompt, $event)"
                      class="p-1.5 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      title="KI-Kategorisierung"
                    >
                      <mat-icon class="text-sm">psychology</mat-icon>
                    </button>
                    <button 
                      (click)="deletePrompt(prompt.id, $event)"
                      class="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      title="Löschen"
                    >
                      <mat-icon class="text-sm">delete</mat-icon>
                    </button>
                  </div>
                </div>
                <h3 class="text-lg font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">{{ prompt.title }}</h3>
                <p class="text-sm text-slate-600 mb-6 line-clamp-3 italic leading-relaxed">"{{ prompt.description }}"</p>
                
                <div class="flex gap-2">
                  <button 
                    (click)="copyPrompt(prompt.content, $event)"
                    class="flex-1 py-2.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                  >
                    <mat-icon class="text-sm">content_copy</mat-icon>
                    Kopieren
                  </button>
                  <button 
                    (click)="openDetail(prompt)"
                    class="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-400 rounded-xl transition-all"
                  >
                    <mat-icon class="text-sm">visibility</mat-icon>
                  </button>
                </div>
              </div>
            </div>
          } @empty {
            <div class="col-span-full py-20 text-center">
              <mat-icon class="text-6xl text-slate-200 mb-4">search_off</mat-icon>
              <p class="text-slate-500">Keine Prompts gefunden, die Ihren Kriterien entsprechen.</p>
            </div>
          }
        </div>
      </div>
    </div>

    <!-- Add Modal -->
    @if (showAddModal) {
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-300">
          <div class="p-6 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white">
            <h3 class="text-xl font-bold">Neuen Prompt anlegen</h3>
            <button (click)="showAddModal = false" class="p-1 hover:bg-white/20 rounded-full transition-colors">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <form (submit)="addPrompt()" class="p-6 space-y-4">
            <div>
              <label for="p-title" class="block text-sm font-semibold text-slate-700 mb-1">Titel</label>
              <input id="p-title" type="text" [(ngModel)]="newPrompt.title" name="title" required class="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all">
            </div>
            <div>
              <label for="p-category" class="block text-sm font-semibold text-slate-700 mb-1">Kategorie</label>
              <div class="flex gap-2">
                <select id="p-category" [(ngModel)]="newPrompt.category" name="category" required class="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all">
                  @for (cat of categories; track cat) {
                    <option [value]="cat">{{ cat }}</option>
                  }
                </select>
                <button 
                  type="button"
                  (click)="suggestCategoryForNewPrompt()"
                  [disabled]="!newPrompt.content || isCategorizing()"
                  class="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors disabled:opacity-50 flex items-center gap-1"
                  title="KI-Kategorie vorschlagen"
                >
                  <mat-icon class="text-sm">{{ isCategorizing() ? 'sync' : 'psychology' }}</mat-icon>
                  KI
                </button>
              </div>
            </div>
            <div>
              <label for="p-description" class="block text-sm font-semibold text-slate-700 mb-1">Kurzbeschreibung</label>
              <textarea id="p-description" [(ngModel)]="newPrompt.description" name="description" rows="2" required class="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"></textarea>
            </div>
            <div>
              <label for="p-content" class="block text-sm font-semibold text-slate-700 mb-1">Prompt Text</label>
              <textarea id="p-content" [(ngModel)]="newPrompt.content" name="content" rows="4" required class="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-mono text-sm"></textarea>
            </div>
            <div class="pt-4 flex gap-3">
              <button type="button" (click)="showAddModal = false" class="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition-all">Abbrechen</button>
              <button type="submit" class="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">Speichern</button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- Detail Modal -->
    @if (selectedPrompt()) {
      @let prompt = selectedPrompt()!;
      <div class="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4" (click)="selectedPrompt.set(null)" (keydown.escape)="selectedPrompt.set(null)" tabindex="0" role="button">
        <div class="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-500" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()" tabindex="0" role="document">
          <!-- Header Image/Banner -->
          <div class="h-48 bg-gradient-to-br from-indigo-600 to-violet-700 relative p-8 flex items-end">
            <button (click)="selectedPrompt.set(null)" class="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all">
              <mat-icon>close</mat-icon>
            </button>
            <div class="flex items-center gap-6">
              <div class="w-20 h-20 bg-white rounded-2xl shadow-xl flex items-center justify-center text-indigo-600">
                <mat-icon class="text-4xl">auto_awesome</mat-icon>
              </div>
              <div>
                <span class="px-3 py-1 bg-white/20 text-white text-[10px] font-bold rounded-full uppercase tracking-widest backdrop-blur-md mb-2 inline-block">
                  {{ prompt.category }}
                </span>
                <h3 class="text-3xl font-bold text-white">{{ prompt.title }}</h3>
              </div>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto p-8">
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div class="lg:col-span-2 space-y-8">
                <section>
                  <h4 class="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Der Prompt</h4>
                  <div class="p-6 bg-slate-50 rounded-3xl border border-slate-100 font-mono text-sm text-slate-700 leading-relaxed relative group">
                    <button 
                      (click)="copyPrompt(prompt.content, $event)"
                      class="absolute top-4 right-4 p-2 bg-white shadow-sm border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <mat-icon class="text-sm">content_copy</mat-icon>
                    </button>
                    {{ prompt.content }}
                  </div>
                </section>

                <section>
                  <h4 class="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Beschreibung & Tipps</h4>
                  <p class="text-slate-600 leading-relaxed">{{ prompt.longDescription || prompt.description }}</p>
                </section>

                <section>
                  <h4 class="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Vorschau / Screens</h4>
                  <div class="grid grid-cols-3 gap-4">
                    @for (screen of prompt.screenshots; track screen) {
                      <div class="aspect-video rounded-2xl overflow-hidden border border-slate-100 shadow-sm group/img cursor-zoom-in">
                        <img [src]="screen" [alt]="prompt.title" class="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-500" referrerpolicy="no-referrer">
                      </div>
                    }
                  </div>
                </section>
              </div>

              <div class="space-y-6">
                <div class="p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
                  <h4 class="font-bold text-indigo-900 mb-2">KI-Optimiert</h4>
                  <p class="text-xs text-indigo-700 leading-relaxed">Dieser Prompt wurde für maximale Präzision mit Gemini 3.1 Pro optimiert.</p>
                </div>
                
                <div class="space-y-3">
                  <button 
                    (click)="copyPrompt(prompt.content, $event)"
                    class="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-3"
                  >
                    <mat-icon>content_copy</mat-icon>
                    Prompt kopieren
                  </button>
                  <div class="text-center">
                    <span class="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Hinzugefügt am {{ prompt.date | date:'dd.MM.yyyy' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class PromptGalleryComponent implements OnInit, OnDestroy {
  private geminiService = inject(GeminiService);
  private toastService = inject(ToastService);

  prompts = signal<Prompt[]>([]);
  searchQuery = '';
  isListening = false;
  isAiSearching = false;
  isSeeding = signal(false);
  isCategorizing = signal(false);
  showAddModal = false;
  selectedPrompt = signal<Prompt | null>(null);

  categories = ['Analyse', 'Kommunikation', 'Entwicklung', 'Kreativität', 'Strukturierung', 'Support', 'Marketing', 'Strategie'];
  selectedCategories = new Set<string>();

  newPrompt: Partial<Prompt> = {
    title: '',
    category: 'Analyse',
    description: '',
    content: ''
  };

  private recognition: SpeechRecognition | null = null;
  private unsubscribe: (() => void) | null = null;

  ngOnInit() {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        this.loadPrompts();
      }
    });

    // Initialize Speech Recognition
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (SpeechRecognitionClass) {
      this.recognition = new SpeechRecognitionClass();
      if (this.recognition) {
        this.recognition.lang = 'de-DE';
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
  
        this.recognition.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = event.results[0][0].transcript;
          this.searchQuery = transcript;
          this.onSearchChange();
          this.isListening = false;
        };
  
        this.recognition.onerror = () => {
          this.isListening = false;
          this.toastService.show('Spracherkennung fehlgeschlagen', 'error');
        };
  
        this.recognition.onend = () => {
          this.isListening = false;
        };
      }
    }
  }

  ngOnDestroy() {
    if (this.unsubscribe) this.unsubscribe();
  }

  loadPrompts() {
    const q = query(collection(db, 'prompts'));
    this.unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prompt));
      this.prompts.set(data);
      if (data.length > 0) {
        setTimeout(() => this.animateGrid(), 100);
      }
    });
  }

  animateGrid() {
    const items = document.querySelectorAll('#prompt-grid > div');
    if (items.length > 0) {
      animate(
        items,
        { opacity: [0, 1], y: [20, 0] },
        { delay: stagger(0.05), duration: 0.5, ease: "easeOut" }
      );
    }
  }

  filteredPrompts() {
    let list = this.prompts();
    
    if (this.selectedCategories.size > 0) {
      list = list.filter(p => this.selectedCategories.has(p.category));
    }

    if (this.searchQuery && !this.isAiSearching) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(p => 
        p.title.toLowerCase().includes(q) || 
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }

    return list;
  }

  onSearchChange() {
    // Standard filtering is handled by filteredPrompts()
  }

  async performAiSearch() {
    if (!this.searchQuery) return;
    
    this.isAiSearching = true;
    this.toastService.show('KI analysiert Ihre Anfrage...', 'info');

    try {
      const relevantTitles = await this.geminiService.searchPrompts(this.searchQuery, this.prompts());
      if (relevantTitles.length > 0) {
        const filtered = this.prompts().filter(p => relevantTitles.includes(p.title));
        this.prompts.set(filtered);
        this.toastService.show(`${relevantTitles.length} relevante Prompts gefunden`, 'success');
      } else {
        this.toastService.show('Keine passenden Prompts durch KI gefunden', 'info');
      }
    } catch {
      this.toastService.show('KI-Suche fehlgeschlagen', 'error');
    } finally {
      this.isAiSearching = false;
    }
  }

  toggleVoiceInput() {
    if (!this.recognition) {
      this.toastService.show('Spracherkennung wird von diesem Browser nicht unterstützt', 'error');
      return;
    }

    if (this.isListening) {
      this.recognition.stop();
    } else {
      this.isListening = true;
      this.recognition.start();
    }
  }

  toggleCategory(cat: string) {
    if (this.selectedCategories.has(cat)) {
      this.selectedCategories.delete(cat);
    } else {
      this.selectedCategories.add(cat);
    }
  }

  async suggestCategoryForNewPrompt() {
    if (!this.newPrompt.content) return;
    
    this.isCategorizing.set(true);
    try {
      const suggested = await this.geminiService.suggestCategory(this.newPrompt.content, this.categories);
      this.newPrompt.category = suggested;
      this.toastService.show(`Kategorie "${suggested}" vorgeschlagen`, 'success');
    } catch {
      this.toastService.show('Fehler bei der Kategorisierung', 'error');
    } finally {
      this.isCategorizing.set(false);
    }
  }

  async categorizeExistingPrompt(prompt: Prompt, event: Event) {
    event.stopPropagation();
    this.toastService.show('KI analysiert Prompt...', 'info');
    
    try {
      const suggested = await this.geminiService.suggestCategory(prompt.content, this.categories);
      if (suggested !== prompt.category) {
        await setDoc(doc(db, 'prompts', prompt.id), { ...prompt, category: suggested });
        this.toastService.show(`Kategorie auf "${suggested}" aktualisiert`, 'success');
      } else {
        this.toastService.show('Kategorie ist bereits optimal', 'info');
      }
    } catch {
      this.toastService.show('Fehler bei der Kategorisierung', 'error');
    }
  }

  async addPrompt() {
    if (!auth.currentUser) return;

    try {
      const newDocRef = doc(collection(db, 'prompts'));
      const promptData = {
        id: newDocRef.id,
        ...this.newPrompt,
        uid: auth.currentUser.uid,
        date: new Date().toISOString(),
        screenshots: [
          `https://picsum.photos/seed/${Math.random()}/800/600`,
          `https://picsum.photos/seed/${Math.random()}/800/600`,
          `https://picsum.photos/seed/${Math.random()}/800/600`
        ]
      };

      await setDoc(newDocRef, promptData);
      this.showAddModal = false;
      this.newPrompt = { title: '', category: 'Analyse', description: '', content: '' };
      this.toastService.show('Prompt erfolgreich hinzugefügt', 'success');
    } catch {
      this.toastService.show('Fehler beim Speichern', 'error');
    }
  }

  async deletePrompt(id: string, event: Event) {
    event.stopPropagation();
    if (confirm('Möchten Sie diesen Prompt wirklich löschen?')) {
      try {
        await deleteDoc(doc(db, 'prompts', id));
        this.toastService.show('Prompt gelöscht', 'success');
      } catch {
        this.toastService.show('Fehler beim Löschen', 'error');
      }
    }
  }

  copyPrompt(text: string, event: Event) {
    event.stopPropagation();
    navigator.clipboard.writeText(text);
    this.toastService.show('Prompt kopiert!', 'success');
  }

  openDetail(prompt: Prompt) {
    this.selectedPrompt.set(prompt);
  }

  async seedData() {
    if (!auth.currentUser || this.isSeeding()) return;
    
    this.isSeeding.set(true);
    this.toastService.show('Starte Seeding von 200 Prompts...', 'info');

    try {
      const batchSize = 10;
      const totalPerCategory = 25; // 8 categories * 25 = 200 total
      
      for (const cat of this.categories) {
        this.toastService.show(`Generiere Prompts für ${cat}...`, 'info');
        
        // Generate in smaller batches to avoid timeouts
        for (let i = 0; i < totalPerCategory; i += batchSize) {
          const count = Math.min(batchSize, totalPerCategory - i);
          const generated = await this.geminiService.generateSeedPrompts(cat, count);
          
          const batch = writeBatch(db);
          generated.forEach(p => {
            const newDocRef = doc(collection(db, 'prompts'));
            batch.set(newDocRef, {
              id: newDocRef.id,
              ...p,
              category: cat,
              uid: auth.currentUser!.uid,
              date: new Date().toISOString(),
              screenshots: [
                `https://picsum.photos/seed/${Math.random()}/800/600`,
                `https://picsum.photos/seed/${Math.random()}/800/600`,
                `https://picsum.photos/seed/${Math.random()}/800/600`
              ]
            });
          });
          await batch.commit();
        }
      }
      
      this.toastService.show('Seeding erfolgreich abgeschlossen!', 'success');
    } catch (error) {
      console.error('Seeding error:', error);
      this.toastService.show('Fehler beim Seeding', 'error');
    } finally {
      this.isSeeding.set(false);
    }
  }
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: Event) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  length: number;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
