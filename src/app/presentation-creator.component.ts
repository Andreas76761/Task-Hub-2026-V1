import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { GeminiService } from './gemini.service';
import { ToastService } from './toast.service';
import { CommonModule } from '@angular/common';
import { 
  auth, db, onAuthStateChanged, User,
  collection, doc, setDoc, OperationType, handleFirestoreError 
} from './firebase';

@Component({
  selector: 'app-presentation-creator',
  standalone: true,
  imports: [MatIconModule, FormsModule, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-full flex flex-col bg-gray-50 relative">
      <div class="p-6 border-b border-gray-200 bg-white flex justify-between items-center shrink-0">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Präsentation erstellen</h1>
          <p class="text-sm text-gray-500 mt-1">Nutze KI, um professionelle Präsentationsstrukturen und Inhalte zu generieren</p>
        </div>
      </div>
      
      <div class="flex-1 overflow-y-auto p-6">
        <div class="max-w-4xl mx-auto space-y-6">
          <!-- Input Section -->
          <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <mat-icon class="text-blue-600">auto_awesome</mat-icon>
              Thema & Details
            </h3>
            <div class="space-y-4">
              <div>
                <label for="topic" class="block text-sm font-semibold text-gray-700 mb-1">Thema der Präsentation</label>
                <input 
                  id="topic"
                  type="text" 
                  [(ngModel)]="topic" 
                  placeholder="z.B. Die Zukunft der KI im Marketing" 
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
              </div>
              <div>
                <label for="targetAudience" class="block text-sm font-semibold text-gray-700 mb-1">Zielgruppe</label>
                <input 
                  id="targetAudience"
                  type="text" 
                  [(ngModel)]="targetAudience" 
                  placeholder="z.B. Management, Technik-Team, Kunden" 
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
              </div>
              <div>
                <label for="slideCount" class="block text-sm font-semibold text-gray-700 mb-1">Anzahl der Folien</label>
                <input 
                  id="slideCount"
                  type="number" 
                  [(ngModel)]="slideCount" 
                  min="3" 
                  max="20" 
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
              </div>
              <div>
                <label for="instructions" class="block text-sm font-semibold text-gray-700 mb-1">Zusätzliche Anweisungen</label>
                <textarea 
                  id="instructions"
                  [(ngModel)]="instructions" 
                  rows="3" 
                  placeholder="z.B. Fokus auf Kosteneffizienz, inklusive Fallbeispiele..." 
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                ></textarea>
              </div>
              <button 
                (click)="generatePresentation()" 
                [disabled]="isGenerating() || !topic()"
                class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <mat-icon [class.animate-spin]="isGenerating()">{{ isGenerating() ? 'autorenew' : 'magic_button' }}</mat-icon>
                {{ isGenerating() ? 'Generiere Struktur...' : 'Präsentation generieren' }}
              </button>
            </div>
          </div>

          <!-- Result Section -->
          @if (generatedContent()) {
            <div class="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-bold text-gray-900">Generierte Struktur</h3>
                <div class="flex gap-2">
                  <button (click)="saveToArchive()" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Im Archiv speichern">
                    <mat-icon>save</mat-icon>
                  </button>
                  <button (click)="copyToClipboard()" class="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors" title="Kopieren">
                    <mat-icon>content_copy</mat-icon>
                  </button>
                </div>
              </div>
              
              <div class="prose prose-blue max-w-none whitespace-pre-wrap text-gray-700 leading-relaxed">
                {{ generatedContent() }}
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
  `]
})
export class PresentationCreatorComponent {
  private gemini = inject(GeminiService);
  private toast = inject(ToastService);
  
  topic = signal('');
  targetAudience = signal('');
  slideCount = signal(10);
  instructions = signal('');
  isGenerating = signal(false);
  generatedContent = signal<string | null>(null);
  user = signal<User | null>(null);

  constructor() {
    onAuthStateChanged(auth, (user) => {
      this.user.set(user);
    });
  }

  async generatePresentation() {
    if (!this.topic()) return;
    
    this.isGenerating.set(true);
    try {
      const prompt = `Erstelle eine detaillierte Präsentationsstruktur für das Thema: "${this.topic()}".
      Zielgruppe: ${this.targetAudience() || 'Allgemein'}
      Anzahl der Folien: ${this.slideCount()}
      Zusätzliche Anweisungen: ${this.instructions() || 'Keine'}
      
      Bitte gib für jede Folie einen Titel und stichpunktartige Inhalte an.`;
      
      const result = await this.gemini.generateText(prompt);
      this.generatedContent.set(result);
      this.toast.show('Präsentationsstruktur erfolgreich generiert!', 'success');
    } catch (error) {
      console.error('Generation error:', error);
      this.toast.show('Fehler bei der Generierung.', 'error');
    } finally {
      this.isGenerating.set(false);
    }
  }

  async saveToArchive() {
    if (!this.generatedContent() || !this.user()) return;
    
    try {
      const newDocRef = doc(collection(db, 'presentations'));
      const presData = {
        id: newDocRef.id,
        uid: this.user()?.uid,
        title: this.topic(),
        type: 'pdf', // Default for generated content
        category: 'Generiert',
        tags: ['KI-generiert', 'Entwurf'],
        date: new Date().toISOString(),
        size: 'N/A',
        fileUrl: '', // No actual file yet, just the text content
        storagePath: '',
        content: this.generatedContent()
      };
      
      await setDoc(newDocRef, presData);
      this.toast.show('Im Archiv gespeichert!', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'presentations');
    }
  }

  copyToClipboard() {
    if (!this.generatedContent()) return;
    navigator.clipboard.writeText(this.generatedContent()!);
    this.toast.show('In die Zwischenablage kopiert!', 'success');
  }
}
