import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { AiSkill, KiTool } from './models';
import { collection, query, onSnapshot, updateDoc, deleteDoc, doc, db, auth, setDoc, writeBatch } from './firebase';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-skills-agents',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-full flex flex-col bg-gray-50">
      <!-- Header -->
      <header class="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between shrink-0">
        <div>
          <h2 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <mat-icon class="text-indigo-600">psychology</mat-icon>
            Skills, Agenten & Plugins
          </h2>
          <p class="text-sm text-gray-500">Erweiterungen und Fähigkeiten für KI-Tools verwalten</p>
        </div>
        <div class="flex items-center gap-3">
          <div class="relative flex items-center">
            <mat-icon class="absolute left-3 text-gray-400">search</mat-icon>
            <input 
              type="text" 
              [(ngModel)]="searchTerm"
              placeholder="Suchen..."
              class="pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none w-64 transition-all"
            >
            <button 
              (click)="startVoiceSearch()"
              [class.text-red-500]="isListening()"
              class="absolute right-2 p-1.5 hover:bg-gray-100 rounded-full transition-colors"
              title="Sprachsuche"
            >
              <mat-icon [class.animate-pulse]="isListening()">{{ isListening() ? 'mic' : 'mic_none' }}</mat-icon>
            </button>
          </div>
          <button 
            (click)="seedData()"
            [disabled]="isSeeding()"
            class="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            <mat-icon [class.animate-spin]="isSeeding()">{{ isSeeding() ? 'sync' : 'auto_awesome' }}</mat-icon>
            200 je Kat. laden
          </button>
          <button 
            (click)="openAddModal()"
            class="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
          >
            <mat-icon>add</mat-icon> Neu anlegen
          </button>
        </div>
      </header>

      <!-- Filters -->
      <div class="bg-white border-b border-gray-200 px-8 py-3 flex items-center gap-4 shrink-0 overflow-x-auto">
        <button 
          (click)="activeFilter.set('All')"
          [class.bg-indigo-100]="activeFilter() === 'All'"
          [class.text-indigo-700]="activeFilter() === 'All'"
          class="px-4 py-1.5 rounded-full text-sm font-medium hover:bg-gray-100 transition-colors whitespace-nowrap"
        >
          Alle
        </button>
        @for (type of types; track type) {
          <button 
            (click)="activeFilter.set(type)"
            [class.bg-indigo-100]="activeFilter() === type"
            [class.text-indigo-700]="activeFilter() === type"
            class="px-4 py-1.5 rounded-full text-sm font-medium hover:bg-gray-100 transition-colors whitespace-nowrap"
          >
            {{ type }}
          </button>
        }
      </div>

      <!-- Grid -->
      <div class="flex-1 overflow-y-auto p-8">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          @for (skill of filteredSkills(); track skill.id) {
            <div class="bg-white rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-all overflow-hidden group">
              <div class="p-6">
                <div class="flex justify-between items-start mb-4">
                  <span 
                    class="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider"
                    [ngClass]="{
                      'bg-purple-100 text-purple-700': skill.type === 'Skill',
                      'bg-blue-100 text-blue-700': skill.type === 'Agent',
                      'bg-emerald-100 text-emerald-700': skill.type === 'Plugin',
                      'bg-amber-100 text-amber-700': skill.type === 'MCP',
                      'bg-rose-100 text-rose-700': skill.type === 'API'
                    }"
                  >
                    {{ skill.type }}
                  </span>
                  <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button (click)="editSkill(skill)" class="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-indigo-600 transition-colors">
                      <mat-icon style="font-size: 18px; width: 18px; height: 18px;">edit</mat-icon>
                    </button>
                    <button (click)="deleteSkill(skill.id)" class="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-red-600 transition-colors">
                      <mat-icon style="font-size: 18px; width: 18px; height: 18px;">delete</mat-icon>
                    </button>
                  </div>
                </div>

                <h3 class="text-lg font-bold text-gray-900 mb-2">{{ skill.name }}</h3>
                <p class="text-sm text-gray-500 line-clamp-3 mb-4 h-15">{{ skill.description }}</p>

                @if (skill.toolId) {
                  <div class="flex items-center gap-2 text-xs text-indigo-600 font-medium mb-4 bg-indigo-50 px-3 py-2 rounded-lg">
                    <mat-icon style="font-size: 14px; width: 14px; height: 14px;">build</mat-icon>
                    Tool: {{ getToolName(skill.toolId) }}
                  </div>
                }

                <div class="flex flex-wrap gap-1.5 mb-4">
                  @for (tag of skill.tags; track tag) {
                    <span class="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">#{{ tag }}</span>
                  }
                </div>

                @if (skill.link) {
                  <a 
                    [href]="skill.link" 
                    target="_blank"
                    class="flex items-center justify-center gap-2 w-full py-2 bg-gray-50 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 rounded-xl text-sm font-medium transition-all border border-gray-100 hover:border-indigo-100"
                  >
                    <mat-icon style="font-size: 16px; width: 16px; height: 16px;">open_in_new</mat-icon>
                    Link öffnen
                  </a>
                }
              </div>
            </div>
          }
        </div>
        
        @if (filteredSkills().length === 0) {
          <div class="flex flex-col items-center justify-center h-64 text-gray-400">
            <mat-icon style="font-size: 48px; width: 48px; height: 48px;" class="mb-4">search_off</mat-icon>
            <p>Keine Einträge gefunden</p>
          </div>
        }
      </div>

      <!-- Add/Edit Modal -->
      @if (showModal()) {
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div class="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-50">
              <h3 class="text-lg font-bold text-gray-900 flex items-center gap-2">
                <mat-icon class="text-indigo-600">{{ editingSkill() ? 'edit' : 'add_circle' }}</mat-icon>
                {{ editingSkill() ? 'Eintrag bearbeiten' : 'Neu anlegen' }}
              </h3>
              <button (click)="closeModal()" class="p-2 hover:bg-white/50 rounded-full transition-colors">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            
            <div class="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label for="skillName" class="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input 
                  id="skillName"
                  type="text" 
                  [(ngModel)]="skillForm.name"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="z.B. GPT-4 Vision Agent"
                >
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label for="skillType" class="block text-sm font-medium text-gray-700 mb-1">Typ</label>
                  <select 
                    id="skillType"
                    [(ngModel)]="skillForm.type"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white"
                  >
                    @for (type of types; track type) {
                      <option [value]="type">{{ type }}</option>
                    }
                  </select>
                </div>
                <div>
                  <label for="skillTool" class="block text-sm font-medium text-gray-700 mb-1">Zugehöriges Tool (optional)</label>
                  <select 
                    id="skillTool"
                    [(ngModel)]="skillForm.toolId"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white"
                  >
                    <option value="">Kein Tool</option>
                    @for (tool of tools(); track tool.id) {
                      <option [value]="tool.id">{{ tool.name }}</option>
                    }
                  </select>
                </div>
              </div>
              
              <div>
                <label for="skillDesc" class="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                <textarea 
                  id="skillDesc"
                  [(ngModel)]="skillForm.description"
                  rows="4"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="Was kann dieser Skill/Agent?"
                ></textarea>
              </div>

              <div>
                <label for="skillLink" class="block text-sm font-medium text-gray-700 mb-1">Link (optional)</label>
                <input 
                  id="skillLink"
                  type="url" 
                  [(ngModel)]="skillForm.link"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="https://..."
                >
              </div>

              <div>
                <label for="skillTags" class="block text-sm font-medium text-gray-700 mb-1">Tags (kommagetrennt)</label>
                <input 
                  id="skillTags"
                  type="text" 
                  [(ngModel)]="skillForm.tags"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="KI, Automatisierung, Python..."
                >
              </div>
            </div>

            <div class="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button 
                (click)="closeModal()"
                class="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg transition-colors"
              >
                Abbrechen
              </button>
              <button 
                (click)="saveSkill()"
                [disabled]="!skillForm.name || !skillForm.description"
                class="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ editingSkill() ? 'Speichern' : 'Erstellen' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class SkillsAgentsComponent {
  private toast = inject(ToastService);
  skills = signal<AiSkill[]>([]);
  tools = signal<KiTool[]>([]);
  showModal = signal(false);
  editingSkill = signal<AiSkill | null>(null);
  searchTerm = signal('');
  activeFilter = signal('All');
  isListening = signal(false);
  isSeeding = signal(false);

  types: AiSkill['type'][] = ['Skill', 'Agent', 'Plugin', 'MCP', 'API'];

  skillForm = {
    name: '',
    type: 'Skill' as AiSkill['type'],
    toolId: '',
    description: '',
    link: '',
    tags: ''
  };

  filteredSkills = computed(() => {
    let result = this.skills();
    
    if (this.activeFilter() !== 'All') {
      result = result.filter(s => s.type === this.activeFilter());
    }
    
    const search = this.searchTerm().toLowerCase();
    if (search) {
      result = result.filter(s => 
        s.name.toLowerCase().includes(search) || 
        s.description.toLowerCase().includes(search) ||
        s.tags.some(t => t.toLowerCase().includes(search))
      );
    }
    
    return result.sort((a, b) => b.date.localeCompare(a.date));
  });

  constructor() {
    this.loadData();
  }

  private loadData() {
    // Load Skills
    const qSkills = query(collection(db, 'ai-skills'));
    onSnapshot(qSkills, (snapshot) => {
      const skills = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as AiSkill));
      this.skills.set(skills);
    });

    // Load Tools for selection
    const qTools = query(collection(db, 'ki-tools'));
    onSnapshot(qTools, (snapshot) => {
      const tools = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as KiTool));
      this.tools.set(tools);
    });
  }

  getToolName(toolId: string) {
    return this.tools().find(t => t.id === toolId)?.name || 'Unbekanntes Tool';
  }

  openAddModal() {
    this.editingSkill.set(null);
    this.skillForm = {
      name: '',
      type: 'Skill',
      toolId: '',
      description: '',
      link: '',
      tags: ''
    };
    this.showModal.set(true);
  }

  editSkill(skill: AiSkill) {
    this.editingSkill.set(skill);
    this.skillForm = {
      name: skill.name,
      type: skill.type,
      toolId: skill.toolId || '',
      description: skill.description,
      link: skill.link || '',
      tags: skill.tags.join(', ')
    };
    this.showModal.set(true);
  }

  async saveSkill() {
    const user = auth.currentUser;
    if (!user) return;

    const skillData: Partial<AiSkill> = {
      uid: user.uid,
      name: this.skillForm.name,
      type: this.skillForm.type,
      toolId: this.skillForm.toolId || undefined,
      description: this.skillForm.description,
      link: this.skillForm.link || undefined,
      tags: this.skillForm.tags.split(',').map(t => t.trim()).filter(t => !!t),
      date: this.editingSkill()?.date || new Date().toISOString()
    };

    try {
      if (this.editingSkill()) {
        await updateDoc(doc(db, 'ai-skills', this.editingSkill()!.id), skillData);
        this.toast.show('Eintrag aktualisiert', 'success');
      } else {
        const newId = crypto.randomUUID();
        await setDoc(doc(db, 'ai-skills', newId), { ...skillData, id: newId });
        this.toast.show('Eintrag erstellt', 'success');
      }
      this.closeModal();
    } catch {
      this.toast.show('Fehler beim Speichern', 'error');
    }
  }

  async deleteSkill(id: string) {
    if (confirm('Eintrag wirklich löschen?')) {
      try {
        await deleteDoc(doc(db, 'ai-skills', id));
        this.toast.show('Eintrag gelöscht', 'success');
      } catch {
        this.toast.show('Fehler beim Löschen', 'error');
      }
    }
  }

  closeModal() {
    this.showModal.set(false);
  }

  startVoiceSearch() {
    const win = window as unknown as Record<string, unknown>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (win['SpeechRecognition'] || win['webkitSpeechRecognition']) as any;
    if (!SpeechRecognition) {
      this.toast.show('Spracherkennung wird von diesem Browser nicht unterstützt.', 'error');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'de-DE';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      this.isListening.set(true);
    };

    recognition.onresult = (event: { results: Record<number, Record<number, { transcript: string }>> }) => {
      const transcript = event.results[0][0].transcript;
      this.searchTerm.set(transcript);
      this.isListening.set(false);
    };

    recognition.onerror = (event: { error: string }) => {
      console.error('Speech recognition error', event.error);
      this.isListening.set(false);
      this.toast.show('Fehler bei der Spracherkennung: ' + event.error, 'error');
    };

    recognition.onend = () => {
      this.isListening.set(false);
    };

    recognition.start();
  }

  async seedData() {
    const user = auth.currentUser;
    if (!user) {
      this.toast.show('Bitte loggen Sie sich ein.', 'error');
      return;
    }

    if (this.isSeeding()) return;

    this.isSeeding.set(true);
    this.toast.show('Lade 1000 Elemente (200 je Kategorie)...', 'info');

    try {
      const categories: AiSkill['type'][] = ['Skill', 'Agent', 'Plugin', 'MCP', 'API'];
      const batchSize = 500;
      let currentBatch = writeBatch(db);
      let count = 0;

      for (const type of categories) {
        for (let i = 1; i <= 200; i++) {
          const id = crypto.randomUUID();
          const skillRef = doc(db, 'ai-skills', id);
          const skillData: AiSkill = {
            id,
            uid: user.uid,
            name: `${type} #${i} - Automatisch generiert`,
            type: type,
            description: `Dies ist ein automatisch generierter Eintrag für die Kategorie ${type}. Er dient zum Testen von großen Datenmengen und Filtern.`,
            tags: [type.toLowerCase(), 'auto-gen', `test-${i}`],
            date: new Date().toISOString()
          };

          currentBatch.set(skillRef, skillData);
          count++;

          if (count % batchSize === 0) {
            await currentBatch.commit();
            currentBatch = writeBatch(db);
          }
        }
      }

      if (count % batchSize !== 0) {
        await currentBatch.commit();
      }

      this.toast.show('1000 Elemente erfolgreich geladen!', 'success');
    } catch (error) {
      console.error('Error seeding data:', error);
      this.toast.show('Fehler beim Laden der Testdaten.', 'error');
    } finally {
      this.isSeeding.set(false);
    }
  }
}
