import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { TodoTask, KiTool } from './models';
import { collection, query, onSnapshot, updateDoc, deleteDoc, doc, db, auth, setDoc } from './firebase';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-todo-activities',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-full flex flex-col bg-gray-50">
      <!-- Header -->
      <header class="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between shrink-0">
        <div>
          <h2 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <mat-icon class="text-emerald-600">assignment</mat-icon>
            To Do Aktivitäten & Mural Board
          </h2>
          <p class="text-sm text-gray-500">Aufgaben planen und visuell organisieren</p>
        </div>
        <button 
          (click)="openAddModal()"
          class="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
        >
          <mat-icon>add</mat-icon> Neue Aufgabe
        </button>
      </header>

      <!-- Board -->
      <div class="flex-1 overflow-x-auto p-8 flex gap-6 items-start">
        @for (column of columns; track column.id) {
          <div class="w-80 shrink-0 flex flex-col h-full max-h-full">
            <div class="flex items-center justify-between mb-4 px-2">
              <h3 class="font-bold text-gray-700 flex items-center gap-2">
                <span class="w-2 h-2 rounded-full" [style.background-color]="column.color"></span>
                {{ column.title }}
                <span class="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{{ getTasksByStatus(column.id).length }}</span>
              </h3>
            </div>
            
            <div 
              class="flex-1 overflow-y-auto space-y-3 p-2 bg-gray-100/50 rounded-xl border-2 border-dashed border-transparent hover:border-gray-200 transition-colors"
              (dragover)="$event.preventDefault()"
              (drop)="onDrop($event, column.id)"
            >
              @for (task of getTasksByStatus(column.id); track task.id) {
                <div 
                  draggable="true"
                  (dragstart)="onDragStart($event, task)"
                  class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group"
                >
                  <div class="flex justify-between items-start mb-2">
                    <span 
                      class="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider"
                      [ngClass]="{
                        'bg-red-100 text-red-700': task.priority === 'Hoch',
                        'bg-amber-100 text-amber-700': task.priority === 'Mittel',
                        'bg-blue-100 text-blue-700': task.priority === 'Niedrig'
                      }"
                    >
                      {{ task.priority }}
                    </span>
                    <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button (click)="editTask(task)" class="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600">
                        <mat-icon style="font-size: 16px; width: 16px; height: 16px;">edit</mat-icon>
                      </button>
                      <button (click)="deleteTask(task.id)" class="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-red-600">
                        <mat-icon style="font-size: 16px; width: 16px; height: 16px;">delete</mat-icon>
                      </button>
                    </div>
                  </div>
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">{{ task.taskNumber }}</span>
                    <h4 class="font-semibold text-gray-900 truncate">{{ task.title }}</h4>
                  </div>
                  <p class="text-xs text-gray-500 line-clamp-2 mb-3">{{ task.description }}</p>
                  
                  @if (task.kiCategory || task.kiToolId) {
                    <div class="flex items-center gap-2 mb-3 text-[10px]">
                      @if (task.kiCategory) {
                        <span class="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                          <mat-icon style="font-size: 10px; width: 10px; height: 10px;">category</mat-icon>
                          {{ task.kiCategory }}
                        </span>
                      }
                      @if (task.kiToolId) {
                        <span class="flex items-center gap-1 text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                          <mat-icon style="font-size: 10px; width: 10px; height: 10px;">build</mat-icon>
                          {{ getToolName(task.kiToolId) }}
                        </span>
                      }
                    </div>
                  }
                  
                  <div class="flex flex-wrap gap-1 mb-3">
                    @for (tag of task.tags; track tag) {
                      <span class="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">#{{ tag }}</span>
                    }
                  </div>

                  <div class="flex items-center justify-between text-[10px] text-gray-400 border-t pt-2">
                    <div class="flex flex-col gap-1">
                      <span class="flex items-center gap-1">
                        <mat-icon style="font-size: 12px; width: 12px; height: 12px;">person</mat-icon>
                        {{ task.creatorName }}
                      </span>
                      <span class="flex items-center gap-1">
                        <mat-icon style="font-size: 12px; width: 12px; height: 12px;">calendar_today</mat-icon>
                        {{ task.date | date:'dd.MM.yy HH:mm' }}
                      </span>
                    </div>
                    @if (task.dueDate) {
                      <span class="flex items-center gap-1 text-amber-600 font-medium self-end">
                        <mat-icon style="font-size: 12px; width: 12px; height: 12px;">timer</mat-icon>
                        {{ task.dueDate | date:'dd.MM.yy' }}
                      </span>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        }
      </div>

      <!-- Add/Edit Modal -->
      @if (showModal()) {
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div class="p-6 border-b border-gray-100 flex items-center justify-between bg-emerald-50">
              <h3 class="text-lg font-bold text-gray-900 flex items-center gap-2">
                <mat-icon class="text-emerald-600">{{ editingTask() ? 'edit' : 'add_task' }}</mat-icon>
                {{ editingTask() ? 'Aufgabe bearbeiten' : 'Neue Aufgabe' }}
              </h3>
              <button (click)="closeModal()" class="p-2 hover:bg-white/50 rounded-full transition-colors">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            
            <div class="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label for="taskTitle" class="block text-sm font-medium text-gray-700 mb-1 flex items-center justify-between">
                  Titel
                  <button (click)="startVoiceInput('title')" class="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-emerald-600" [class.text-red-500]="isListeningField() === 'title'">
                    <mat-icon style="font-size: 18px; width: 18px; height: 18px;">{{ isListeningField() === 'title' ? 'mic' : 'mic_none' }}</mat-icon>
                  </button>
                </label>
                <input 
                  id="taskTitle"
                  type="text" 
                  [(ngModel)]="taskForm.title"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  placeholder="Was ist zu tun?"
                >
              </div>
              
              <div>
                <label for="taskDesc" class="block text-sm font-medium text-gray-700 mb-1 flex items-center justify-between">
                  Beschreibung
                  <button (click)="startVoiceInput('description')" class="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-emerald-600" [class.text-red-500]="isListeningField() === 'description'">
                    <mat-icon style="font-size: 18px; width: 18px; height: 18px;">{{ isListeningField() === 'description' ? 'mic' : 'mic_none' }}</mat-icon>
                  </button>
                </label>
                <textarea 
                  id="taskDesc"
                  [(ngModel)]="taskForm.description"
                  rows="3"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  placeholder="Details zur Aufgabe..."
                ></textarea>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label for="taskCreator" class="block text-sm font-medium text-gray-700 mb-1">Erfasser</label>
                  <input 
                    id="taskCreator"
                    type="text" 
                    [(ngModel)]="taskForm.creatorName"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    placeholder="Dein Name"
                  >
                </div>
                <div>
                  <label for="taskDueDate" class="block text-sm font-medium text-gray-700 mb-1">Fälligkeit</label>
                  <input 
                    id="taskDueDate"
                    type="date" 
                    [(ngModel)]="taskForm.dueDate"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  >
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label for="taskKiCategory" class="block text-sm font-medium text-gray-700 mb-1">KI Kategorie</label>
                  <select 
                    id="taskKiCategory"
                    [(ngModel)]="taskForm.kiCategory"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white"
                  >
                    <option value="">Keine Auswahl</option>
                    <option value="Text">Text</option>
                    <option value="Bild">Bild</option>
                    <option value="Video">Video</option>
                    <option value="Audio">Audio</option>
                    <option value="Code">Code</option>
                    <option value="Agent">Agent</option>
                  </select>
                </div>
                <div>
                  <label for="taskKiTool" class="block text-sm font-medium text-gray-700 mb-1">KI Tool</label>
                  <select 
                    id="taskKiTool"
                    [(ngModel)]="taskForm.kiToolId"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white"
                  >
                    <option value="">Keine Auswahl</option>
                    @for (tool of kiTools(); track tool.id) {
                      <option [value]="tool.id">{{ tool.name }}</option>
                    }
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label for="taskStatus" class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select 
                    id="taskStatus"
                    [(ngModel)]="taskForm.status"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white"
                  >
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Review">Review</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
                <div>
                  <label for="taskPriority" class="block text-sm font-medium text-gray-700 mb-1">Priorität</label>
                  <select 
                    id="taskPriority"
                    [(ngModel)]="taskForm.priority"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white"
                  >
                    <option value="Hoch">Hoch</option>
                    <option value="Mittel">Mittel</option>
                    <option value="Niedrig">Niedrig</option>
                  </select>
                </div>
              </div>

              <div>
                <label for="taskTags" class="block text-sm font-medium text-gray-700 mb-1">Tags (kommagetrennt)</label>
                <input 
                  id="taskTags"
                  type="text" 
                  [(ngModel)]="taskForm.tags"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  placeholder="Planung, Design, KI..."
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
                (click)="saveTask()"
                [disabled]="!taskForm.title"
                class="px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ editingTask() ? 'Speichern' : 'Erstellen' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class TodoActivitiesComponent {
  private toast = inject(ToastService);
  tasks = signal<TodoTask[]>([]);
  kiTools = signal<KiTool[]>([]);
  showModal = signal(false);
  editingTask = signal<TodoTask | null>(null);
  isListeningField = signal<string | null>(null);

  columns = [
    { id: 'To Do', title: 'To Do', color: '#94a3b8' },
    { id: 'In Progress', title: 'In Arbeit', color: '#3b82f6' },
    { id: 'Review', title: 'Review', color: '#f59e0b' },
    { id: 'Done', title: 'Erledigt', color: '#10b981' }
  ];

  taskForm = {
    title: '',
    description: '',
    status: 'To Do' as TodoTask['status'],
    priority: 'Mittel' as TodoTask['priority'],
    dueDate: '',
    tags: '',
    creatorName: '',
    kiCategory: '',
    kiToolId: ''
  };

  constructor() {
    this.loadTasks();
    this.loadKiTools();
  }

  private loadTasks() {
    const q = query(collection(db, 'todo-tasks'));
    onSnapshot(q, (snapshot) => {
      const tasks = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as TodoTask));
      this.tasks.set(tasks);
    });
  }

  private loadKiTools() {
    const q = query(collection(db, 'ki-tools'));
    onSnapshot(q, (snapshot) => {
      const tools = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as KiTool));
      this.kiTools.set(tools);
    });
  }

  getToolName(toolId: string) {
    return this.kiTools().find(t => t.id === toolId)?.name || 'Unbekanntes Tool';
  }

  getTasksByStatus(status: string) {
    return this.tasks().filter(t => t.status === status);
  }

  openAddModal() {
    const user = auth.currentUser;
    this.editingTask.set(null);
    this.taskForm = {
      title: '',
      description: '',
      status: 'To Do',
      priority: 'Mittel',
      dueDate: '',
      tags: '',
      creatorName: user?.displayName || user?.email?.split('@')[0] || '',
      kiCategory: '',
      kiToolId: ''
    };
    this.showModal.set(true);
  }

  editTask(task: TodoTask) {
    this.editingTask.set(task);
    this.taskForm = {
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate || '',
      tags: task.tags.join(', '),
      creatorName: task.creatorName || '',
      kiCategory: task.kiCategory || '',
      kiToolId: task.kiToolId || ''
    };
    this.showModal.set(true);
  }

  async saveTask() {
    const user = auth.currentUser;
    if (!user) return;

    const taskData: Partial<TodoTask> = {
      uid: user.uid,
      title: this.taskForm.title,
      description: this.taskForm.description,
      status: this.taskForm.status,
      priority: this.taskForm.priority,
      dueDate: this.taskForm.dueDate || undefined,
      tags: this.taskForm.tags.split(',').map(t => t.trim()).filter(t => !!t),
      date: this.editingTask()?.date || new Date().toISOString(),
      creatorName: this.taskForm.creatorName,
      kiCategory: this.taskForm.kiCategory || undefined,
      kiToolId: this.taskForm.kiToolId || undefined,
      taskNumber: this.editingTask()?.taskNumber || `TASK-${Date.now().toString().slice(-6)}`
    };

    try {
      if (this.editingTask()) {
        await updateDoc(doc(db, 'todo-tasks', this.editingTask()!.id), taskData);
        this.toast.show('Aufgabe aktualisiert', 'success');
      } else {
        const newId = crypto.randomUUID();
        await setDoc(doc(db, 'todo-tasks', newId), { ...taskData, id: newId });
        this.toast.show('Aufgabe erstellt', 'success');
      }
      this.closeModal();
    } catch {
      this.toast.show('Fehler beim Speichern', 'error');
    }
  }

  startVoiceInput(field: 'title' | 'description') {
    const win = window as unknown as Record<string, unknown>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (win['SpeechRecognition'] || win['webkitSpeechRecognition']) as any;
    
    if (!SpeechRecognition) {
      this.toast.show('Spracherkennung wird nicht unterstützt.', 'error');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'de-DE';
    
    recognition.onstart = () => this.isListeningField.set(field);
    recognition.onend = () => this.isListeningField.set(null);
    
    recognition.onresult = (event: { results: Record<number, Record<number, { transcript: string }>> }) => {
      const transcript = event.results[0][0].transcript;
      this.taskForm[field] = (this.taskForm[field] + ' ' + transcript).trim();
    };

    recognition.start();
  }

  async deleteTask(id: string) {
    if (confirm('Aufgabe wirklich löschen?')) {
      try {
        await deleteDoc(doc(db, 'todo-tasks', id));
        this.toast.show('Aufgabe gelöscht', 'success');
      } catch {
        this.toast.show('Fehler beim Löschen', 'error');
      }
    }
  }

  closeModal() {
    this.showModal.set(false);
  }

  // Drag & Drop
  onDragStart(event: DragEvent, task: TodoTask) {
    event.dataTransfer?.setData('taskId', task.id);
  }

  async onDrop(event: DragEvent, newStatus: string) {
    event.preventDefault();
    const taskId = event.dataTransfer?.getData('taskId');
    if (taskId) {
      const task = this.tasks().find(t => t.id === taskId);
      if (task && task.status !== newStatus) {
        try {
          await updateDoc(doc(db, 'todo-tasks', taskId), { status: newStatus as TodoTask['status'] });
        } catch {
          this.toast.show('Fehler beim Verschieben', 'error');
        }
      }
    }
  }
}
