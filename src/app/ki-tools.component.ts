import { Component, ChangeDetectionStrategy, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { collection, query, onSnapshot, deleteDoc, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError, writeBatch, setDoc } from './firebase';
import { GeminiService } from './gemini.service';
import { FormsModule } from '@angular/forms';
import { KiTool } from './models';
import { KiCategoryService } from './ki-category.service';

@Component({
  selector: 'app-ki-tools',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-full flex flex-col bg-gray-50">
      <!-- Header -->
      <div class="bg-white border-b border-gray-200 px-8 py-6 flex justify-between items-center shrink-0">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">KI Tools</h1>
          <p class="text-sm text-gray-500 mt-1">Verwaltung und Analyse der wichtigsten KI-Werkzeuge</p>
        </div>
        <div class="flex gap-3">
          <button (click)="seedTools()" [disabled]="isSeeding()" class="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-200 disabled:opacity-50">
            <mat-icon>{{ isSeeding() ? 'hourglass_empty' : 'auto_awesome' }}</mat-icon>
            {{ isSeeding() ? 'Lade Tools...' : '200 Standard Tools laden' }}
          </button>
          <button (click)="showAddModal.set(true)" class="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
            <mat-icon>add</mat-icon> Neues Tool hinzufügen
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-auto p-8">
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-200">
                <th class="px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Name & Link</th>
                <th class="px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Kategorie</th>
                <th class="px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Kosten</th>
                <th class="px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Zugang</th>
                <th class="px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Zweck</th>
                <th class="px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Labels</th>
                <th class="px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Vor/Nachteile</th>
                <th class="px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Wettbewerber</th>
                <th class="px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              @for (tool of tools(); track tool.id) {
                <tr [class.bg-green-50]="tool.access === 'ja'" class="hover:bg-gray-50 transition-colors">
                  <td class="px-6 py-4">
                    <div class="font-medium text-gray-900">{{ tool.name }}</div>
                    @if (tool.link) {
                      <a [href]="tool.link" target="_blank" class="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1">
                        <mat-icon class="text-[12px] w-[12px] h-[12px]">open_in_new</mat-icon> Website
                      </a>
                    }
                  </td>
                  <td class="px-6 py-4">
                    <span class="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-tight">
                      {{ tool.category || 'Unkategorisiert' }}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-600">{{ tool.costs }}</td>
                  <td class="px-6 py-4">
                    <span [class]="getAccessClass(tool.access)" class="px-2.5 py-1 rounded-full text-xs font-medium">
                      {{ tool.access }}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" [title]="tool.purpose">
                    {{ tool.purpose }}
                  </td>
                  <td class="px-6 py-4">
                    <div class="flex flex-col gap-1.5">
                      @if (tool.euAiAct !== undefined) {
                        <div class="flex items-center gap-1.5">
                          <mat-icon [class]="tool.euAiAct ? 'text-emerald-500' : 'text-rose-500'" class="text-sm">
                            {{ tool.euAiAct ? 'check_circle' : 'cancel' }}
                          </mat-icon>
                          <span class="text-[10px] font-medium text-gray-700">EU AI Act</span>
                        </div>
                      }
                      @if (tool.cloudStorage !== undefined) {
                        <div class="flex items-center gap-1.5">
                          <mat-icon [class]="tool.cloudStorage ? 'text-blue-500' : 'text-gray-400'" class="text-sm">
                            cloud
                          </mat-icon>
                          <span class="text-[10px] font-medium text-gray-700">Cloud</span>
                        </div>
                      }
                      @if (tool.customerScore !== undefined) {
                        <div class="flex items-center gap-1.5">
                          <div class="flex items-center text-amber-500">
                            <mat-icon class="text-sm">star</mat-icon>
                            <span class="text-[10px] font-bold">{{ tool.customerScore }}</span>
                          </div>
                          <span class="text-[10px] font-medium text-gray-700">Score</span>
                        </div>
                      }
                      @if (tool.securityLabel) {
                        <div class="flex items-center gap-1.5">
                          <mat-icon class="text-sm text-indigo-500">verified_user</mat-icon>
                          <span class="text-[10px] font-medium text-gray-700 truncate max-w-[80px]" [title]="tool.securityLabel">
                            {{ tool.securityLabel }}
                          </span>
                        </div>
                      }
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <div class="flex flex-col gap-1">
                      <div class="flex flex-wrap gap-1">
                        @for (pro of tool.pros; track pro) {
                          <span class="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">+ {{ pro }}</span>
                        }
                      </div>
                      <div class="flex flex-wrap gap-1">
                        @for (con of tool.cons; track con) {
                          <span class="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded">- {{ con }}</span>
                        }
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <div class="flex flex-wrap gap-1">
                      @for (comp of tool.competitors; track comp) {
                        <span class="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{{ comp }}</span>
                      }
                    </div>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <div class="flex justify-end gap-2">
                      <button (click)="enrichWithAI(tool)" class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="KI-Analyse">
                        <mat-icon>auto_awesome</mat-icon>
                      </button>
                      <button (click)="deleteTool(tool.id)" class="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="8" class="px-6 py-12 text-center text-gray-500">
                    <mat-icon class="text-4xl mb-2 text-gray-300">smart_toy</mat-icon>
                    <p>Keine KI Tools gefunden. Legen Sie ein neues Tool an.</p>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Add Modal -->
      @if (showAddModal()) {
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div class="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 class="text-xl font-bold text-gray-900">Neues KI Tool</h2>
              <button (click)="showAddModal.set(false)" class="text-gray-400 hover:text-gray-600">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            
            <div class="p-6 overflow-auto space-y-4">
              <div>
                <label for="toolName" class="block text-sm font-medium text-gray-700 mb-1">Name des Tools</label>
                <input id="toolName" [(ngModel)]="newToolName" type="text" placeholder="z.B. ChatGPT, Midjourney..." class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
              </div>

              <div>
                <label for="toolLink" class="block text-sm font-medium text-gray-700 mb-1">Link</label>
                <input id="toolLink" [(ngModel)]="newToolLink" type="text" placeholder="https://..." class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
              </div>

              <div>
                <label for="toolPrivateComment" class="block text-sm font-medium text-gray-700 mb-1">Privater Kommentar</label>
                <textarea id="toolPrivateComment" [(ngModel)]="newToolPrivateComment" rows="2" placeholder="Ihre Notizen..." class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"></textarea>
              </div>

              <div>
                <label for="toolCategory" class="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
                <select id="toolCategory" [(ngModel)]="newToolCategory" class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">Keine Kategorie</option>
                  @for (cat of kiCategoryService.categories(); track cat.id) {
                    <option [value]="cat.name">{{ cat.name }}</option>
                  }
                </select>
              </div>
              
              <div class="flex gap-4">
                <div class="flex-1">
                  <label for="toolAccess" class="block text-sm font-medium text-gray-700 mb-1">Zugang</label>
                  <select id="toolAccess" [(ngModel)]="newToolAccess" class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="ja">Ja (im Einsatz)</option>
                    <option value="nein">Nein</option>
                    <option value="Planung">Planung</option>
                    <option value="in genehmigung">In Genehmigung</option>
                    <option value="verboten">Verboten</option>
                    <option value="gecancelt">Gecancelt</option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4 pt-2">
                <div class="flex items-center gap-2">
                  <input id="euAiAct" type="checkbox" [(ngModel)]="newToolEuAiAct" class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                  <label for="euAiAct" class="text-sm font-medium text-gray-700">EU AI Act konform</label>
                </div>
                <div class="flex items-center gap-2">
                  <input id="cloudStorage" type="checkbox" [(ngModel)]="newToolCloudStorage" class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                  <label for="cloudStorage" class="text-sm font-medium text-gray-700">Cloud-Speicherung</label>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label for="customerScore" class="block text-sm font-medium text-gray-700 mb-1">Kundenscore (0-100)</label>
                  <input id="customerScore" type="number" [(ngModel)]="newToolCustomerScore" min="0" max="100" class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                </div>
                <div>
                  <label for="securityLabel" class="block text-sm font-medium text-gray-700 mb-1">Sicherheitslabel</label>
                  <input id="securityLabel" type="text" [(ngModel)]="newToolSecurityLabel" placeholder="z.B. ISO 27001" class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                </div>
              </div>

              <div class="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <div class="flex items-start gap-3">
                  <mat-icon class="text-blue-600">info</mat-icon>
                  <p class="text-xs text-blue-800 leading-relaxed">
                    Nach dem Speichern können Sie den <strong>KI-Button</strong> in der Liste nutzen, um automatisch Link, Kosten, Zweck und Wettbewerber zu ergänzen.
                  </p>
                </div>
              </div>
            </div>

            <div class="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button (click)="showAddModal.set(false)" class="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium">Abbrechen</button>
              <button (click)="addTool()" [disabled]="!newToolName()" class="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm">
                Speichern
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Loading Overlay -->
      @if (isAnalyzing() || isSeeding()) {
        <div class="fixed inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-[60]">
          <div class="relative">
            <div class="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
            <mat-icon class="absolute inset-0 m-auto text-blue-600 animate-pulse">auto_awesome</mat-icon>
          </div>
          <p class="mt-4 text-gray-900 font-medium">{{ isSeeding() ? 'Lade 200 Tools...' : 'KI analysiert Tool-Daten...' }}</p>
          <p class="text-sm text-gray-500">Dies kann einen Moment dauern</p>
        </div>
      }
    </div>
  `
})
export class KiToolsComponent {
  private gemini = inject(GeminiService);
  kiCategoryService = inject(KiCategoryService);
  tools = signal<KiTool[]>([]);
  showAddModal = signal(false);
  isAnalyzing = signal(false);
  isSeeding = signal(false);

  newToolName = signal('');
  newToolLink = signal('');
  newToolPrivateComment = signal('');
  newToolCategory = signal('');
  newToolAccess = signal<KiTool['access']>('nein');
  newToolEuAiAct = signal(false);
  newToolCloudStorage = signal(false);
  newToolCustomerScore = signal<number | undefined>(undefined);
  newToolSecurityLabel = signal('');

  constructor() {
    effect(() => {
      const user = auth.currentUser;
      if (user) {
        const q = query(
          collection(db, 'ki-tools'),
          orderBy('date', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const toolsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as KiTool));
          this.tools.set(toolsData);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, 'ki-tools');
        });

        return () => unsubscribe();
      }
      return;
    });
  }

  getAccessClass(access: KiTool['access']): string {
    switch (access) {
      case 'ja': return 'bg-emerald-100 text-emerald-700';
      case 'nein': return 'bg-gray-100 text-gray-700';
      case 'Planung': return 'bg-blue-100 text-blue-700';
      case 'in genehmigung': return 'bg-amber-100 text-amber-700';
      case 'verboten': return 'bg-rose-100 text-rose-700';
      case 'gecancelt': return 'bg-slate-100 text-slate-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  async addTool() {
    const user = auth.currentUser;
    if (!user || !this.newToolName()) return;

    try {
      const toolId = doc(collection(db, 'ki-tools')).id;
      const newDocRef = doc(db, 'ki-tools', toolId);
      await setDoc(newDocRef, {
        id: toolId,
        uid: user.uid,
        name: this.newToolName(),
        access: this.newToolAccess(),
        category: this.newToolCategory(),
        link: this.newToolLink(),
        privateComment: this.newToolPrivateComment(),
        costs: 'Noch nicht analysiert',
        purpose: '',
        pros: [],
        cons: [],
        competitors: [],
        euAiAct: this.newToolEuAiAct(),
        cloudStorage: this.newToolCloudStorage(),
        customerScore: this.newToolCustomerScore() || 0,
        securityLabel: this.newToolSecurityLabel(),
        date: new Date().toISOString()
      });

      this.newToolName.set('');
      this.newToolLink.set('');
      this.newToolPrivateComment.set('');
      this.newToolCategory.set('');
      this.newToolAccess.set('nein');
      this.newToolEuAiAct.set(false);
      this.newToolCloudStorage.set(false);
      this.newToolCustomerScore.set(undefined);
      this.newToolSecurityLabel.set('');
      this.showAddModal.set(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'ki-tools');
    }
  }

  async deleteTool(id: string) {
    try {
      await deleteDoc(doc(db, 'ki-tools', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'ki-tools');
    }
  }

  async enrichWithAI(tool: KiTool) {
    this.isAnalyzing.set(true);
    try {
      const enriched = await this.gemini.enrichKiToolData(tool.name);
      await updateDoc(doc(db, 'ki-tools', tool.id), {
        ...enriched
      });
    } catch (error) {
      console.error('Error enriching tool:', error);
    } finally {
      this.isAnalyzing.set(false);
    }
  }

  async seedTools() {
    const user = auth.currentUser;
    if (!user || this.isSeeding()) return;

    this.isSeeding.set(true);
    
    const categories = [
      { name: 'Programming', tools: ['GitHub Copilot', 'Cursor', 'Tabnine', 'Replit Ghostwriter', 'Amazon CodeWhisperer', 'Sourcegraph Cody', 'MutableAI', 'Codeium', 'Tabby', 'Warp AI', 'Blackbox AI', 'AskCodi', 'Codiga', 'DeepCode', 'Kite', 'IntelliCode', 'Ponicode', 'Sourcery', 'Bito', 'Refact.ai'] },
      { name: 'LLM', tools: ['ChatGPT', 'Claude', 'Gemini', 'Llama 3', 'Mistral AI', 'Perplexity AI', 'Cohere', 'Anthropic', 'OpenAI API', 'Hugging Face Chat', 'Poe', 'You.com', 'Groq', 'DeepSeek', 'Character.ai', 'Pi', 'Jasper Chat', 'Copy.ai Chat', 'Writesonic Chat', 'H2O.ai'] },
      { name: 'Text', tools: ['Jasper', 'Copy.ai', 'Writesonic', 'Grammarly', 'Quillbot', 'Anyword', 'Rytr', 'Wordtune', 'Hugging Face', 'Notion AI', 'DeepL Write', 'Frase', 'Surfer SEO', 'Scalenut', 'ContentBot', 'Sudowrite', 'Lex', 'Typeface', 'Simplified', 'Hypotenuse AI'] },
      { name: 'Bild', tools: ['Midjourney', 'DALL-E 3', 'Stable Diffusion', 'Adobe Firefly', 'Canva Magic Studio', 'Leonardo.ai', 'BlueWillow', 'Lexica', 'Playground AI', 'Fotor AI', 'DeepAI', 'Artbreeder', 'NightCafe', 'Craiyon', 'Runway Gen-2 (Image)', 'Pika Art (Image)', 'Ideogram', 'Krea.ai', 'Recraft', 'Magnific AI'] },
      { name: 'Video', tools: ['Sora', 'Runway Gen-2', 'Pika Art', 'HeyGen', 'Synthesia', 'Lumen5', 'InVideo', 'Pictory', 'Descript', 'Kaiber', 'Wonder Dynamics', 'D-ID', 'Colossyan', 'Elai.io', 'Hour One', 'DeepBrain AI', 'Fliki', 'Veed.io', 'CapCut AI', 'Adobe Premiere AI'] },
      { name: 'Übersetzung', tools: ['DeepL', 'Google Translate AI', 'ModernMT', 'Smartling', 'Lilt', 'Unbabel', 'Phrase', 'Transifex', 'Lokalise', 'Memsource', 'RWS Language Cloud', 'SDL Trados', 'MemoQ', 'Wordfast', 'Crowdin', 'Localazy', 'Weglot', 'TranslatePress', 'Polylang AI', 'WPML AI'] },
      { name: 'Robotic', tools: ['Boston Dynamics', 'Tesla Optimus', 'Figure AI', 'Sanctuary AI', 'Apptronik', 'Agility Robotics', 'Unitree', 'Xiaomi CyberOne', 'Engineered Arts', 'Hanson Robotics', 'SoftBank Robotics', 'Universal Robots', 'KUKA AI', 'ABB Robotics AI', 'Fanuc AI', 'Intuitive Surgical', 'Diligent Robotics', 'Starship Technologies', 'Nuro', 'Zipline'] },
      { name: 'AI Agentur', tools: ['AutoGPT', 'BabyAGI', 'AgentGPT', 'Godmode', 'SuperAGI', 'Cognosys', 'HyperWrite Personal Assistant', 'Lindy.ai', 'Induced AI', 'MultiOn', 'Adept AI', 'Imbue', 'Fixie.ai', 'Dust.tt', 'Relevance AI', 'Spell.so', 'Camel AGI', 'Yohei', 'Aomni', 'Fine-Tuning Agency'] },
      { name: 'Lernen', tools: ['Khan Academy Khanmigo', 'Duolingo Max', 'Coursera Coach', 'Udacity AI Tutor', 'Quizlet Q-Chat', 'Chegg AI', 'Brainly AI', 'Photomath AI', 'Socratic by Google', 'ELSA Speak', 'Memrise AI', 'Babbel AI', 'Rosetta Stone AI', 'Lingvist AI', 'Speak AI', 'Loora', 'TalkPal', 'Preply AI', 'Italki AI', 'Lingoda AI'] },
      { name: 'Data Science', tools: ['Pandas AI', 'Jupyter AI', 'DataRobot', 'H2O.ai Driverless AI', 'RapidMiner', 'Knime', 'Alteryx AI', 'Databricks AI', 'Snowflake Cortex', 'Dataiku', 'Anaconda Assistant', 'Polymer', 'Akkio', 'MonkeyLearn', 'BigML', 'Obviously AI', 'Clarifai', 'Verta', 'Domino Data Lab', 'Comet ML'] }
    ];

    try {
      const batch = writeBatch(db);
      
      // First, ensure categories exist
      for (const cat of categories) {
        if (!this.kiCategoryService.categories().find(c => c.name === cat.name)) {
          const catRef = doc(collection(db, 'ki-categories'));
          batch.set(catRef, {
            id: catRef.id,
            uid: user.uid,
            name: cat.name
          });
        }
      }

      // Then add tools
      for (const cat of categories) {
        for (const toolName of cat.tools) {
          const toolRef = doc(collection(db, 'ki-tools'));
          batch.set(toolRef, {
            id: toolRef.id,
            uid: user.uid,
            name: toolName,
            access: 'nein',
            category: cat.name,
            link: '',
            costs: 'Noch nicht analysiert',
            purpose: '',
            pros: [],
            cons: [],
            competitors: [],
            euAiAct: false,
            cloudStorage: true,
            customerScore: 0,
            securityLabel: '',
            date: new Date().toISOString()
          });
        }
      }

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'ki-tools');
    } finally {
      this.isSeeding.set(false);
    }
  }
}
