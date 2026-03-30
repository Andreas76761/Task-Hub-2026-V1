import { Component, ChangeDetectionStrategy, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { KiResource } from './models';
import { GeminiService } from './gemini.service';
import { ToastService } from './toast.service';
import { db, auth, setDoc } from './firebase';
import { collection, onSnapshot, query, deleteDoc, doc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

@Component({
  selector: 'app-ki-resources',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-full flex flex-col bg-gray-50">
      <!-- Header -->
      <div class="bg-white border-b border-gray-200 px-8 py-6 shrink-0">
        <div class="flex justify-between items-center mb-4">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">KI Ressourcen</h1>
            <p class="text-sm text-gray-500 mt-1">Wichtige Links und Quellen für KI-Wissen</p>
          </div>
          <button (click)="showAddModal.set(true)" class="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
            <mat-icon>add</mat-icon>
            <span>Ressource hinzufügen</span>
          </button>
        </div>

        <!-- Advanced Filter & Search -->
        <div class="flex flex-wrap gap-4 items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
          <div class="flex-1 min-w-[300px] relative">
            <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</mat-icon>
            <input 
              type="text" 
              [(ngModel)]="searchQuery" 
              (keyup.enter)="performAiSearch()"
              placeholder="KI-Suche (z.B. 'Zeig mir Lernplattformen für Deep Learning')..." 
              class="w-full pl-10 pr-24 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              aria-label="KI-Suche"
            >
            <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button 
                (click)="toggleVoiceInput()" 
                [class.text-red-500]="isListening()"
                class="p-1 hover:bg-gray-100 rounded-full transition-colors"
                title="Spracheingabe"
              >
                <mat-icon>{{ isListening() ? 'mic' : 'mic_none' }}</mat-icon>
              </button>
              <button 
                (click)="performAiSearch()" 
                class="text-xs font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                [disabled]="isSearching()"
              >
                {{ isSearching() ? 'SUCHT...' : 'KI-SUCHE' }}
              </button>
            </div>
          </div>

          <div class="flex gap-2">
            @for (cat of categories; track cat) {
              <button 
                (click)="toggleCategory(cat)"
                [class]="selectedCategories().includes(cat) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'"
                class="px-3 py-1.5 rounded-full border text-xs font-medium transition-all"
              >
                {{ cat }}
              </button>
            }
          </div>

          @if (isAiFiltered()) {
            <button (click)="resetFilters()" class="text-xs text-red-600 hover:underline flex items-center gap-1">
              <mat-icon class="text-sm">close</mat-icon>
              Filter zurücksetzen
            </button>
          }
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-auto p-8">
        @if (filteredResources().length === 0) {
          <div class="h-full flex flex-col items-center justify-center text-gray-400">
            <mat-icon class="text-6xl mb-4">search_off</mat-icon>
            <p>Keine Ressourcen gefunden.</p>
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (resource of filteredResources(); track resource.id) {
              <div 
                (dblclick)="openDetail(resource)"
                class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all flex flex-col cursor-pointer group relative"
              >
                <div class="flex justify-between items-start mb-4">
                  <div [class]="getCategoryClass(resource.category)" class="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                    {{ resource.category }}
                  </div>
                  <div class="flex gap-2">
                    <button (click)="deleteResource(resource.id, $event)" class="text-gray-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <mat-icon class="text-sm">delete</mat-icon>
                    </button>
                    <a [href]="resource.link" target="_blank" (click)="$event.stopPropagation()" class="text-blue-600 hover:text-blue-800">
                      <mat-icon>open_in_new</mat-icon>
                    </a>
                  </div>
                </div>
                <h3 class="text-lg font-bold text-gray-900 mb-2">{{ resource.title }}</h3>
                <p class="text-sm text-gray-600 flex-1 leading-relaxed line-clamp-3">{{ resource.description }}</p>
                
                <div class="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                  <span class="text-[10px] text-gray-400 uppercase tracking-widest">Doppelklick für Details</span>
                  <a [href]="resource.link" target="_blank" (click)="$event.stopPropagation()" class="text-sm font-medium text-blue-600 hover:underline">Besuchen</a>
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- Add Modal -->
      @if (showAddModal()) {
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 class="text-xl font-bold text-gray-900">Neue Ressource</h2>
              <button (click)="showAddModal.set(false)" class="p-1 hover:bg-gray-200 rounded-full transition-colors">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <div class="p-6 space-y-4">
              <div>
                <label for="title" class="block text-xs font-bold text-gray-500 uppercase mb-1">Titel</label>
                <input id="title" type="text" [(ngModel)]="newResource.title" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
              </div>
              <div>
                <label for="category" class="block text-xs font-bold text-gray-500 uppercase mb-1">Kategorie</label>
                <select id="category" [(ngModel)]="newResource.category" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                  @for (cat of categories; track cat) {
                    <option [value]="cat">{{ cat }}</option>
                  }
                </select>
              </div>
              <div>
                <label for="link" class="block text-xs font-bold text-gray-500 uppercase mb-1">Link</label>
                <input id="link" type="text" [(ngModel)]="newResource.link" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
              </div>
              <div>
                <label for="desc" class="block text-xs font-bold text-gray-500 uppercase mb-1">Kurzbeschreibung</label>
                <textarea id="desc" [(ngModel)]="newResource.description" rows="2" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"></textarea>
              </div>
              <div>
                <label for="longDesc" class="block text-xs font-bold text-gray-500 uppercase mb-1">Detailbeschreibung</label>
                <textarea id="longDesc" [(ngModel)]="newResource.longDescription" rows="4" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"></textarea>
              </div>
            </div>
            <div class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button (click)="showAddModal.set(false)" class="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg transition-colors">Abbrechen</button>
              <button (click)="saveResource()" class="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm">Speichern</button>
            </div>
          </div>
        </div>
      }

      <!-- Detail Modal -->
      @if (selectedResource()) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div class="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-300">
            <div class="relative h-48 bg-gradient-to-r from-blue-600 to-indigo-700 p-8 shrink-0">
              <button (click)="selectedResource.set(null)" class="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors">
                <mat-icon>close</mat-icon>
              </button>
              <div [class]="getCategoryClass(selectedResource()!.category)" class="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 bg-white/20 text-white backdrop-blur-sm border border-white/30">
                {{ selectedResource()!.category }}
              </div>
              <h2 class="text-3xl font-bold text-white">{{ selectedResource()!.title }}</h2>
              <p class="text-blue-100 mt-2">{{ selectedResource()!.link }}</p>
            </div>

            <div class="flex-1 overflow-auto p-8">
              <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div class="lg:col-span-2 space-y-6">
                  <div>
                    <h4 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Über diese Ressource</h4>
                    <p class="text-gray-700 leading-relaxed text-lg">{{ selectedResource()!.longDescription || selectedResource()!.description }}</p>
                  </div>

                  <div>
                    <h4 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Screenshots der Homepage</h4>
                    <div class="grid grid-cols-3 gap-4">
                      @for (screen of selectedResource()!.screenshots; track screen) {
                        <div class="aspect-video bg-gray-100 rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:scale-105 transition-transform cursor-zoom-in">
                          <img [src]="screen" class="w-full h-full object-cover" referrerpolicy="no-referrer" alt="Screenshot der Homepage">
                        </div>
                      }
                    </div>
                  </div>
                </div>

                <div class="space-y-6">
                  <div class="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                    <h4 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Quick Actions</h4>
                    <div class="space-y-3">
                      <a [href]="selectedResource()!.link" target="_blank" class="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-md">
                        <mat-icon>open_in_new</mat-icon>
                        Website öffnen
                      </a>
                      <button (click)="copyLink(selectedResource()!.link)" class="flex items-center justify-center gap-2 w-full py-3 bg-white text-gray-700 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-colors">
                        <mat-icon>content_copy</mat-icon>
                        Link kopieren
                      </button>
                    </div>
                  </div>

                  <div class="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                    <h4 class="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Hinzugefügt am</h4>
                    <p class="text-blue-900 font-medium">{{ selectedResource()!.date | date:'dd.MM.yyyy' }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class KiResourcesComponent implements OnInit, OnDestroy {
  private geminiService = inject(GeminiService);
  private toastService = inject(ToastService);
  
  resources = signal<KiResource[]>([]);
  selectedCategories = signal<string[]>([]);
  searchQuery = '';
  isSearching = signal(false);
  isListening = signal(false);
  isAiFiltered = signal(false);
  aiFilteredTitles = signal<string[]>([]);

  showAddModal = signal(false);
  selectedResource = signal<KiResource | null>(null);

  categories = ['Learning', 'News', 'Directory', 'Community'];
  
  newResource: Partial<KiResource> = {
    title: '',
    description: '',
    longDescription: '',
    link: '',
    category: 'Learning',
    screenshots: []
  };

  private unsubscribe: (() => void) | null = null;
  private recognition: SpeechRecognition | null = null;

  ngOnInit() {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        this.loadResources();
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
          this.isListening.set(false);
          this.performAiSearch();
        };
  
        this.recognition.onerror = () => {
          this.isListening.set(false);
          this.toastService.show('Spracherkennung fehlgeschlagen', 'error');
        };
  
        this.recognition.onend = () => {
          this.isListening.set(false);
        };
      }
    }
  }

  ngOnDestroy() {
    if (this.unsubscribe) this.unsubscribe();
  }

  loadResources() {
    const q = query(collection(db, 'ki_resources'));
    this.unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as KiResource));
      if (data.length === 0) {
        this.seedInitialData();
      } else {
        this.resources.set(data);
      }
    });
  }

  async seedInitialData() {
    const initial = [
      {
        title: 'FutureTools',
        description: 'Eine der größten Sammlungen von KI-Tools, kuratiert von Matt Wolfe.',
        longDescription: 'FutureTools sammelt die besten KI-Tools und organisiert sie so, dass Sie genau das finden, was Sie brauchen. Die Plattform bietet auch einen wöchentlichen Newsletter und Video-Tutorials zu den neuesten Entwicklungen.',
        link: 'https://www.futuretools.io/',
        category: 'Directory' as const,
        screenshots: [
          'https://picsum.photos/seed/ft1/800/600',
          'https://picsum.photos/seed/ft2/800/600',
          'https://picsum.photos/seed/ft3/800/600'
        ]
      },
      {
        title: 'DeepLearning.AI',
        description: 'Hochwertige Kurse von Andrew Ng und anderen Experten.',
        longDescription: 'DeepLearning.AI bietet spezialisierte Ausbildungsprogramme im Bereich der künstlichen Intelligenz an. Von den Grundlagen des Machine Learning bis hin zu fortgeschrittenen Themen wie Generative AI und LLMs.',
        link: 'https://www.deeplearning.ai/',
        category: 'Learning' as const,
        screenshots: [
          'https://picsum.photos/seed/dl1/800/600',
          'https://picsum.photos/seed/dl2/800/600',
          'https://picsum.photos/seed/dl3/800/600'
        ]
      },
      {
        title: 'Hugging Face',
        description: 'Die zentrale Plattform für Open-Source-KI-Modelle und Datensätze.',
        longDescription: 'Hugging Face ist das "GitHub für KI". Hier finden Entwickler Tausende von vortrainierten Modellen, Datensätzen und Demo-Apps (Spaces) für NLP, Computer Vision und Audio.',
        link: 'https://huggingface.co/',
        category: 'Community' as const,
        screenshots: [
          'https://picsum.photos/seed/hf1/800/600',
          'https://picsum.photos/seed/hf2/800/600',
          'https://picsum.photos/seed/hf3/800/600'
        ]
      }
    ];

    for (const res of initial) {
      try {
        const newDocRef = doc(collection(db, 'ki_resources'));
        await setDoc(newDocRef, {
          id: newDocRef.id,
          ...res,
          uid: auth.currentUser?.uid,
          date: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error seeding data:', error);
      }
    }
  }

  filteredResources() {
    let list = this.resources();

    // AI Filter
    if (this.isAiFiltered()) {
      list = list.filter(r => this.aiFilteredTitles().includes(r.title));
    }

    // Category Filter
    if (this.selectedCategories().length > 0) {
      list = list.filter(r => this.selectedCategories().includes(r.category));
    }

    // Text Search (Fallback if AI filter not active)
    if (!this.isAiFiltered() && this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(r => 
        r.title.toLowerCase().includes(q) || 
        r.description.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
      );
    }

    return list;
  }

  toggleCategory(cat: string) {
    this.selectedCategories.update(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  }

  async performAiSearch() {
    if (!this.searchQuery.trim()) {
      this.resetFilters();
      return;
    }

    this.isSearching.set(true);
    try {
      const results = await this.geminiService.searchKiResources(this.searchQuery, this.resources());
      this.aiFilteredTitles.set(results);
      this.isAiFiltered.set(true);
      if (results.length === 0) {
        this.toastService.show('Keine passenden Ressourcen per KI gefunden.', 'info');
      }
    } catch (error) {
      console.error('AI Search error:', error);
      this.toastService.show('KI-Suche fehlgeschlagen', 'error');
    } finally {
      this.isSearching.set(false);
    }
  }

  toggleVoiceInput() {
    if (this.isListening()) {
      this.recognition?.stop();
      this.isListening.set(false);
    } else {
      try {
        this.recognition?.start();
        this.isListening.set(true);
        this.toastService.show('Höre zu...', 'info');
      } catch (error) {
        console.error('Speech recognition start error:', error);
      }
    }
  }

  resetFilters() {
    this.searchQuery = '';
    this.isAiFiltered.set(false);
    this.aiFilteredTitles.set([]);
    this.selectedCategories.set([]);
  }

  async saveResource() {
    if (!this.newResource.title || !this.newResource.link) {
      this.toastService.show('Titel und Link sind erforderlich', 'error');
      return;
    }

    try {
      const newDocRef = doc(collection(db, 'ki_resources'));
      // Generate dummy screenshots for new resources
      const screenshots = [
        `https://picsum.photos/seed/${this.newResource.title}1/800/600`,
        `https://picsum.photos/seed/${this.newResource.title}2/800/600`,
        `https://picsum.photos/seed/${this.newResource.title}3/800/600`
      ];

      await setDoc(newDocRef, {
        id: newDocRef.id,
        ...this.newResource,
        screenshots,
        uid: auth.currentUser?.uid,
        date: new Date().toISOString()
      });

      this.toastService.show('Ressource erfolgreich hinzugefügt', 'success');
      this.showAddModal.set(false);
      this.newResource = { title: '', description: '', longDescription: '', link: '', category: 'Learning', screenshots: [] };
    } catch (error) {
      console.error('Error saving resource:', error);
      this.toastService.show('Fehler beim Speichern', 'error');
    }
  }

  async deleteResource(id: string, event: Event) {
    event.stopPropagation();
    if (confirm('Möchten Sie diese Ressource wirklich löschen?')) {
      try {
        await deleteDoc(doc(db, 'ki_resources', id));
        this.toastService.show('Ressource gelöscht', 'success');
      } catch (error) {
        console.error('Error deleting resource:', error);
        this.toastService.show('Fehler beim Löschen', 'error');
      }
    }
  }

  openDetail(resource: KiResource) {
    this.selectedResource.set(resource);
  }

  copyLink(link: string) {
    navigator.clipboard.writeText(link);
    this.toastService.show('Link in die Zwischenablage kopiert', 'success');
  }

  getCategoryClass(category: KiResource['category']): string {
    switch (category) {
      case 'Learning': return 'bg-blue-100 text-blue-700';
      case 'News': return 'bg-amber-100 text-amber-700';
      case 'Directory': return 'bg-emerald-100 text-emerald-700';
      case 'Community': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
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
