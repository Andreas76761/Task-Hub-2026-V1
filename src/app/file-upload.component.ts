import { Component, ElementRef, ViewChild, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { ActivityService } from './activity.service';
import { MatIconModule } from '@angular/material/icon';
import { NavigationService } from './navigation.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [MatIconModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <div 
        class="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:bg-gray-50 transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[300px]"
        (click)="fileInput.click()"
        (keydown.enter)="fileInput.click()"
        (keydown.space)="fileInput.click()"
        tabindex="0"
        role="button"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
        [class.bg-blue-50]="isDragging"
        [class.border-blue-400]="isDragging"
      >
        <input 
          type="file" 
          #fileInput 
          class="hidden" 
          (change)="onFileSelected($event)" 
          accept=".json,.csv,.txt,.html,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        >
        
        @if (activityService.isLoading()) {
          <mat-icon class="animate-spin text-blue-500 mb-4" style="transform: scale(2); width: 48px; height: 48px;">autorenew</mat-icon>
          <h3 class="text-xl font-medium text-gray-900 mb-2">Analysiere Daten...</h3>
          <p class="text-gray-500">{{ activityService.loadingProgress() || 'Dies kann einen Moment dauern, während die KI die Seiten kategorisiert.' }}</p>
        } @else {
          <div class="bg-blue-100 text-blue-600 p-4 rounded-full mb-4">
            <mat-icon style="transform: scale(1.5); width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">cloud_upload</mat-icon>
          </div>
          <h3 class="text-xl font-medium text-gray-900 mb-2">Aktivitätsdaten hochladen</h3>
          <p class="text-gray-500 max-w-md mx-auto mb-6">
            Lade deinen Google-Suchverlauf oder andere Web-Aktivitäten als JSON, CSV, Textdatei oder Word-Dokument hoch.
          </p>
          <button class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors">
            Datei auswählen
          </button>
        }
      </div>

      <div class="relative">
        <div class="absolute inset-0 flex items-center" aria-hidden="true">
          <div class="w-full border-t border-gray-300"></div>
        </div>
        <div class="relative flex justify-center">
          <span class="bg-white px-3 text-sm text-gray-500">ODER</span>
        </div>
      </div>

      <div class="bg-gray-50 p-6 rounded-xl border border-gray-200">
        <h3 class="text-lg font-medium text-gray-900 mb-2 flex items-center gap-2">
          <mat-icon class="text-blue-600">content_paste</mat-icon>
          Verlauf direkt einfügen
        </h3>
        <p class="text-sm text-gray-600 mb-4">
          Kopiere deinen Suchverlauf direkt aus dem Browser und füge ihn hier ein. Öffne dazu einen der folgenden Links, markiere alles (Strg+A) und kopiere es (Strg+C):
        </p>
        <div class="flex gap-4 mb-4">
          <div class="flex-1 bg-white p-3 rounded border border-gray-200 flex items-center justify-between">
            <code class="text-sm text-blue-600">chrome://history/</code>
            <button (click)="copyToClipboard('chrome://history/')" class="text-gray-400 hover:text-gray-600" title="Kopieren">
              <mat-icon style="font-size: 18px; width: 18px; height: 18px;">content_copy</mat-icon>
            </button>
          </div>
          <div class="flex-1 bg-white p-3 rounded border border-gray-200 flex items-center justify-between">
            <code class="text-sm text-blue-600">edge://history/all</code>
            <button (click)="copyToClipboard('edge://history/all')" class="text-gray-400 hover:text-gray-600" title="Kopieren">
              <mat-icon style="font-size: 18px; width: 18px; height: 18px;">content_copy</mat-icon>
            </button>
          </div>
        </div>
        <textarea 
          [(ngModel)]="pastedText"
          rows="4" 
          class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all mb-4"
          placeholder="Füge hier den kopierten Verlauf ein (Strg+V)..."
        ></textarea>
        <div class="flex justify-end">
          <button 
            (click)="processPastedText()"
            [disabled]="!pastedText() || activityService.isLoading()"
            class="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <mat-icon>play_arrow</mat-icon>
            Daten einlesen
          </button>
        </div>
      </div>
    </div>
  `
})
export class FileUploadComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  activityService = inject(ActivityService);
  nav = inject(NavigationService);
  isDragging = false;
  pastedText = signal('');

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.activityService.processFile(files[0]);
      this.nav.navigateTo('dashboard');
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.activityService.processFile(input.files[0]);
      this.nav.navigateTo('dashboard');
    }
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  processPastedText() {
    const text = this.pastedText();
    if (text) {
      this.activityService.processText(text);
      this.pastedText.set('');
      this.nav.navigateTo('dashboard');
    }
  }
}
