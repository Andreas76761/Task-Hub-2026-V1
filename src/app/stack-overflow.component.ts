import { ChangeDetectionStrategy, Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService } from './gemini.service';
import { ToastService } from './toast.service';
import { StackOverflowTicket } from './models';
import { db, auth, setDoc, OperationType, handleFirestoreError } from './firebase';
import { collection, onSnapshot, query, deleteDoc, doc, writeBatch, orderBy } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { animate, stagger } from "motion";

@Component({
  selector: 'app-stack-overflow',
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
                <mat-icon class="text-orange-600">forum</mat-icon>
                Stackoverflow (Q&A)
              </h2>
              <p class="text-slate-500 mt-1">Fragen und Antworten rund um das Workspace Portal und KI-Integrationen.</p>
            </div>
            <div class="flex items-center gap-2">
              <button 
                (click)="seedData()" 
                [disabled]="isSeeding()"
                class="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm"
              >
                <mat-icon class="text-sm">{{ isSeeding() ? 'hourglass_empty' : 'cloud_upload' }}</mat-icon>
                {{ isSeeding() ? 'Seeding...' : '200 Q&A laden' }}
              </button>
              <button 
                (click)="showAddModal = true"
                class="px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700 transition-colors flex items-center gap-2 shadow-md shadow-orange-200"
              >
                <mat-icon class="text-sm">add</mat-icon>
                Frage stellen
              </button>
            </div>
          </div>

          <div class="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-2">
            <div class="flex-1 relative group">
              <mat-icon class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors">search</mat-icon>
              <input 
                type="text" 
                [(ngModel)]="searchQuery"
                (input)="onSearchChange()"
                placeholder="Suche nach Fragen oder nutze die KI-Suche..."
                class="w-full pl-12 pr-4 py-3 bg-transparent border-none focus:ring-0 text-slate-700 placeholder:text-slate-400"
                aria-label="Ticket Suche"
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
                class="px-4 py-2 bg-orange-50 text-orange-600 rounded-xl text-sm font-semibold hover:bg-orange-100 transition-colors flex items-center gap-2 disabled:opacity-50"
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
                [class.bg-orange-600]="selectedCategories.has(cat)"
                [class.text-white]="selectedCategories.has(cat)"
                [class.bg-white]="!selectedCategories.has(cat)"
                [class.text-slate-600]="!selectedCategories.has(cat)"
                class="px-4 py-1.5 rounded-full text-xs font-medium border border-slate-200 transition-all hover:border-orange-300 shadow-sm"
              >
                {{ cat }}
              </button>
            }
          </div>
        </header>

        <!-- List -->
        <div class="space-y-6" id="ticket-list">
          @for (ticket of filteredTickets(); track ticket.id) {
            <div 
              (dblclick)="openDetail(ticket)"
              class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 group cursor-pointer"
            >
              <div class="p-6">
                <div class="flex items-start gap-6">
                  <div class="hidden md:flex flex-col items-center gap-1 p-3 bg-slate-50 rounded-2xl border border-slate-100 min-w-[70px]">
                    <mat-icon class="text-slate-400">expand_less</mat-icon>
                    <span class="text-lg font-bold text-slate-700">{{ ticket.votes || 0 }}</span>
                    <mat-icon class="text-slate-400">expand_more</mat-icon>
                  </div>
                  <div class="flex-1">
                    <div class="flex items-center justify-between mb-2">
                      <div class="flex gap-2">
                        <span class="px-2 py-0.5 bg-orange-50 text-orange-600 text-[10px] font-bold rounded uppercase tracking-wider">
                          {{ ticket.category }}
                        </span>
                        @for (tag of ticket.tags; track tag) {
                          <span class="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-medium rounded uppercase tracking-wider">
                            {{ tag }}
                          </span>
                        }
                      </div>
                      <button 
                        (click)="deleteTicket(ticket.id, $event)"
                        class="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <mat-icon class="text-sm">delete</mat-icon>
                      </button>
                    </div>
                    <h3 class="text-xl font-bold text-slate-900 mb-2 group-hover:text-orange-600 transition-colors">{{ ticket.title }}</h3>
                    <p class="text-sm text-slate-600 mb-4 line-clamp-2">{{ ticket.description }}</p>
                    
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-4">
                        <span class="text-xs text-slate-400 flex items-center gap-1">
                          <mat-icon class="text-sm">person</mat-icon> {{ ticket.author }}
                        </span>
                        <span class="text-xs text-slate-400 flex items-center gap-1">
                          <mat-icon class="text-sm">schedule</mat-icon> {{ ticket.date | date:'dd.MM.yyyy' }}
                        </span>
                      </div>
                      <div class="flex items-center gap-2">
                        <mat-icon class="text-emerald-500 text-sm">check_circle</mat-icon>
                        <span class="text-xs font-bold text-emerald-600 uppercase tracking-widest">Gelöst</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          } @empty {
            <div class="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
              <mat-icon class="text-6xl text-slate-200 mb-4">forum</mat-icon>
              <p class="text-slate-500">Keine Q&A Einträge gefunden.</p>
            </div>
          }
        </div>
      </div>
    </div>

    <!-- Add Modal -->
    @if (showAddModal) {
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-300">
          <div class="p-6 border-b border-slate-100 flex items-center justify-between bg-orange-600 text-white">
            <h3 class="text-xl font-bold">Neue Frage stellen</h3>
            <button (click)="showAddModal = false" class="p-1 hover:bg-white/20 rounded-full transition-colors">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <form (submit)="addTicket()" class="p-6 space-y-4">
            <div>
              <label for="s-title" class="block text-sm font-semibold text-slate-700 mb-1">Titel</label>
              <input id="s-title" type="text" [(ngModel)]="newTicket.title" name="title" required class="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all">
            </div>
            <div>
              <label for="s-category" class="block text-sm font-semibold text-slate-700 mb-1">Kategorie</label>
              <select id="s-category" [(ngModel)]="newTicket.category" name="category" required class="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all">
                @for (cat of categories; track cat) {
                  <option [value]="cat">{{ cat }}</option>
                }
              </select>
            </div>
            <div>
              <label for="s-question" class="block text-sm font-semibold text-slate-700 mb-1">Frage</label>
              <textarea id="s-question" [(ngModel)]="newTicket.question" name="question" rows="3" required class="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"></textarea>
            </div>
            <div>
              <label for="s-answer" class="block text-sm font-semibold text-slate-700 mb-1">Antwort (optional)</label>
              <textarea id="s-answer" [(ngModel)]="newTicket.answer" name="answer" rows="3" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"></textarea>
            </div>
            <div class="pt-4 flex gap-3">
              <button type="button" (click)="showAddModal = false" class="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition-all">Abbrechen</button>
              <button type="submit" class="flex-1 py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition-all shadow-lg shadow-orange-200">Speichern</button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- Detail Modal -->
    @if (selectedTicket()) {
      @let ticket = selectedTicket()!;
      <div class="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4" (click)="selectedTicket.set(null)" (keydown.escape)="selectedTicket.set(null)" tabindex="0" role="button">
        <div class="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-500" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()" tabindex="0" role="document">
          <div class="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
                <mat-icon>forum</mat-icon>
              </div>
              <div>
                <h3 class="text-2xl font-bold text-slate-900">{{ ticket.title }}</h3>
                <div class="flex items-center gap-3 mt-1">
                  <span class="text-xs text-slate-400 flex items-center gap-1"><mat-icon class="text-sm">person</mat-icon> {{ ticket.author }}</span>
                  <span class="text-xs text-slate-400 flex items-center gap-1"><mat-icon class="text-sm">schedule</mat-icon> {{ ticket.date | date:'dd.MM.yyyy' }}</span>
                  <span class="px-2 py-0.5 bg-orange-100 text-orange-600 text-[10px] font-bold rounded uppercase tracking-wider">{{ ticket.category }}</span>
                </div>
              </div>
            </div>
            <button (click)="selectedTicket.set(null)" class="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="flex-1 overflow-y-auto p-8 space-y-8">
            <section>
              <h4 class="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Die Frage</h4>
              <div class="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm text-slate-800 leading-relaxed italic">
                "{{ ticket.question }}"
              </div>
            </section>

            <section>
              <h4 class="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Die Antwort</h4>
              <div class="p-8 bg-emerald-50 rounded-3xl border border-emerald-100 text-slate-800 leading-relaxed relative">
                <mat-icon class="text-emerald-500 absolute -top-4 -left-4 bg-white rounded-full p-2 shadow-md border border-emerald-100 text-3xl">check_circle</mat-icon>
                {{ ticket.answer }}
              </div>
            </section>

            <section>
              <h4 class="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Screenshots / Belege</h4>
              <div class="grid grid-cols-3 gap-6">
                @for (screen of ticket.screenshots; track screen) {
                  <div class="aspect-video rounded-3xl overflow-hidden border border-slate-200 shadow-lg group/img cursor-zoom-in">
                    <img [src]="screen" [alt]="ticket.title" class="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-500" referrerpolicy="no-referrer">
                  </div>
                }
              </div>
            </section>

            <section>
              <h4 class="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Zusätzliche Informationen</h4>
              <p class="text-slate-600 leading-relaxed">{{ ticket.longDescription || ticket.description }}</p>
            </section>
          </div>

          <div class="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
            <button (click)="selectedTicket.set(null)" class="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-100 transition-all">Schließen</button>
            <button class="px-8 py-3 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 flex items-center gap-2">
              <mat-icon>thumb_up</mat-icon>
              Hilfreich ({{ ticket.votes }})
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class StackOverflowComponent implements OnInit, OnDestroy {
  private geminiService = inject(GeminiService);
  private toastService = inject(ToastService);

  tickets = signal<StackOverflowTicket[]>([]);
  searchQuery = '';
  isListening = false;
  isAiSearching = false;
  isSeeding = signal(false);
  showAddModal = false;
  selectedTicket = signal<StackOverflowTicket | null>(null);

  categories = ['KI-Modelle', 'Integration', 'Security', 'Performance', 'UI/UX', 'Datenmanagement', 'API', 'Rechtliches'];
  selectedCategories = new Set<string>();

  newTicket: Partial<StackOverflowTicket> = {
    title: '',
    category: 'KI-Modelle',
    question: '',
    answer: ''
  };

  private recognition: SpeechRecognition | null = null;
  private unsubscribe: (() => void) | null = null;

  ngOnInit() {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        this.loadTickets();
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

  loadTickets() {
    const q = query(collection(db, 'stack-overflow'), orderBy('date', 'desc'));
    this.unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StackOverflowTicket));
      this.tickets.set(data);
      if (data.length > 0) {
        setTimeout(() => this.animateList(), 100);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'stack-overflow');
    });
  }

  animateList() {
    const items = document.querySelectorAll('#ticket-list > div');
    if (items.length > 0) {
      animate(
        items,
        { opacity: [0, 1], x: [-20, 0] },
        { delay: stagger(0.05), duration: 0.5, ease: "easeOut" }
      );
    }
  }

  filteredTickets() {
    let list = this.tickets();
    
    if (this.selectedCategories.size > 0) {
      list = list.filter(t => this.selectedCategories.has(t.category));
    }

    if (this.searchQuery && !this.isAiSearching) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(t => 
        t.title.toLowerCase().includes(q) || 
        t.question.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    }

    return list;
  }

  onSearchChange() {
    // Standard filtering is handled by filteredTickets()
  }

  async performAiSearch() {
    if (!this.searchQuery) return;
    
    this.isAiSearching = true;
    this.toastService.show('KI analysiert Ihre Anfrage...', 'info');

    try {
      const relevantTitles = await this.geminiService.searchTickets(this.searchQuery, this.tickets());
      if (relevantTitles.length > 0) {
        const filtered = this.tickets().filter(t => relevantTitles.includes(t.title));
        this.tickets.set(filtered);
        this.toastService.show(`${relevantTitles.length} relevante Einträge gefunden`, 'success');
      } else {
        this.toastService.show('Keine passenden Einträge durch KI gefunden', 'info');
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

  async addTicket() {
    if (!auth.currentUser) return;

    try {
      const newDocRef = doc(collection(db, 'stack-overflow'));
      const ticketData = {
        id: newDocRef.id,
        ...this.newTicket,
        uid: auth.currentUser.uid,
        date: new Date().toISOString(),
        author: auth.currentUser.displayName || 'Anonym',
        votes: 0,
        tags: [this.newTicket.category?.toLowerCase() || 'ki'],
        description: this.newTicket.question?.substring(0, 150) + '...',
        screenshots: [
          `https://picsum.photos/seed/${Math.random()}/800/600`,
          `https://picsum.photos/seed/${Math.random()}/800/600`,
          `https://picsum.photos/seed/${Math.random()}/800/600`
        ]
      };

      await setDoc(newDocRef, ticketData);
      this.showAddModal = false;
      this.newTicket = { title: '', category: 'KI-Modelle', question: '', answer: '' };
      this.toastService.show('Frage erfolgreich veröffentlicht', 'success');
    } catch {
      this.toastService.show('Fehler beim Speichern', 'error');
    }
  }

  async deleteTicket(id: string, event: Event) {
    event.stopPropagation();
    if (confirm('Möchten Sie diesen Eintrag wirklich löschen?')) {
      try {
        await deleteDoc(doc(db, 'stack-overflow', id));
        this.toastService.show('Eintrag gelöscht', 'success');
      } catch {
        this.toastService.show('Fehler beim Löschen', 'error');
      }
    }
  }

  openDetail(ticket: StackOverflowTicket) {
    this.selectedTicket.set(ticket);
  }

  async seedData() {
    if (!auth.currentUser || this.isSeeding()) return;
    
    this.isSeeding.set(true);
    this.toastService.show('Starte Seeding von 200 Q&A Einträgen...', 'info');

    try {
      const batchSize = 10;
      const totalPerCategory = 25; // 8 categories * 25 = 200 total
      
      for (const cat of this.categories) {
        this.toastService.show(`Generiere Q&As für ${cat}...`, 'info');
        
        for (let i = 0; i < totalPerCategory; i += batchSize) {
          const count = Math.min(batchSize, totalPerCategory - i);
          const generated = await this.geminiService.generateSeedTickets(cat, count);
          
          const batch = writeBatch(db);
          generated.forEach(t => {
            const newDocRef = doc(collection(db, 'stack-overflow'));
            batch.set(newDocRef, {
              id: newDocRef.id,
              ...t,
              category: cat,
              uid: auth.currentUser!.uid,
              date: new Date().toISOString(),
              author: 'KI-Experte',
              votes: Math.floor(Math.random() * 500),
              tags: [cat.toLowerCase(), 'ki-support'],
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
