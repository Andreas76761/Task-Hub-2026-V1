import { Component, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { GeminiService } from './gemini.service';
import { ToastService } from './toast.service';
import { CommonModule } from '@angular/common';
import JSZip from 'jszip';
import { 
  auth, db, storage, googleProvider, signInWithPopup, signOut, onAuthStateChanged, User,
  collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, where, 
  ref, uploadBytes, getDownloadURL, deleteObject,
  OperationType, handleFirestoreError, QuerySnapshot, QueryDocumentSnapshot 
} from './firebase';

interface Image {
  id: string;
  uid: string;
  url: string;
  title: string;
  tags: string[];
  priority: 'Hoch' | 'Mittel' | 'Niedrig';
  activity: string;
  cluster: string;
  subcluster: string;
  date: Date;
  size: string;
  sourcePath?: string;
  description?: string;
  selected?: boolean;
}

interface Drive {
  id: string;
  name: string;
  path: string;
  icon: string;
}

@Component({
  selector: 'app-images',
  standalone: true,
  imports: [MatIconModule, FormsModule, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:keydown)': 'onKeyDown($event)',
    '(window:keyup)': 'onKeyUp($event)'
  },
  template: `
    <div class="h-full flex flex-col bg-gray-50 relative">
      <div class="p-6 border-b border-gray-200 bg-white flex justify-between items-center shrink-0">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Bilddatenbank</h1>
          <p class="text-sm text-gray-500 mt-1">Zentrale Verwaltung aller Medien und Assets</p>
        </div>
        <div class="flex gap-3">
          @if (isAuthReady()) {
            @if (user()) {
              <div class="flex items-center gap-3 mr-4">
                <img [src]="user()?.photoURL" class="w-8 h-8 rounded-full border border-gray-200" referrerpolicy="no-referrer" alt="Profilbild">
                <div class="text-right">
                  <div class="text-xs font-bold text-gray-900">{{ user()?.displayName }}</div>
                  <button (click)="logout()" class="text-[10px] text-red-600 hover:underline font-bold uppercase tracking-wider">Abmelden</button>
                </div>
              </div>
            } @else {
              <button (click)="login()" class="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm mr-4">
                <mat-icon>login</mat-icon> Anmelden
              </button>
            }
          }

          @if (micPermissionStatus() === 'denied' || micPermissionStatus() === 'prompt') {
            <button (click)="openInNewTab()" class="bg-amber-100 hover:bg-amber-200 text-amber-800 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm border border-amber-200">
              <mat-icon>open_in_new</mat-icon> In neuem Tab öffnen (für Mikrofon)
            </button>
          }
          <button (click)="scanFolders()" [disabled]="isScanning()" class="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm">
            <mat-icon [class.animate-spin]="isScanning()">{{ isScanning() ? 'autorenew' : 'folder_shared' }}</mat-icon> Verzeichnisse scannen
          </button>
          <button (click)="triggerFileUpload()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm">
            <mat-icon>add_photo_alternate</mat-icon> Bilder hochladen
          </button>
          <input type="file" #fileInput class="hidden" multiple accept="image/*" (change)="onFilesUploaded($event)">
        </div>
      </div>
      
      <!-- Permanent Import Toolbar -->
      <div class="p-4 bg-emerald-50 border-b border-emerald-100 flex flex-wrap gap-4 items-center shrink-0">
        <div class="flex items-center gap-2">
          <button (click)="openDriveDialog()" class="bg-white border border-emerald-200 text-emerald-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-emerald-100 transition-colors shadow-sm">
            <mat-icon>{{ selectedDrive()?.icon || 'storage' }}</mat-icon>
            {{ selectedDrive()?.name || 'Laufwerk wählen' }}
          </button>
          
          <div class="relative">
            <button (click)="folderInput.click()" class="bg-white border border-emerald-200 text-emerald-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-emerald-100 transition-colors shadow-sm">
              <mat-icon>folder_open</mat-icon>
              Ordner wählen
            </button>
            <input #folderInput type="file" webkitdirectory directory multiple class="hidden" (change)="onFolderSelected($event)">
          </div>
        </div>

        <div class="h-6 w-px bg-emerald-200 mx-1 hidden sm:block"></div>

        <div class="flex gap-2">
          <button 
            (click)="screenImages()" 
            [disabled]="selectedFilesCount() === 0 || isImporting()"
            class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
          >
            <mat-icon>grid_view</mat-icon> Bilder screenen
          </button>
          <button 
            (click)="startMassImport()" 
            [disabled]="selectedFilesCount() === 0 || isImporting()"
            class="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
          >
            <mat-icon [class.animate-spin]="isImporting()">{{ isImporting() ? 'sync' : 'publish' }}</mat-icon>
            Import starten
          </button>
        </div>

        @if (selectedFilesCount() > 0) {
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
            <mat-icon style="font-size: 14px; width: 14px; height: 14px;">check_circle</mat-icon>
            {{ selectedFilesCount() }} Bilder bereit
          </div>
        }
        
        @if (importDirectoryPath()) {
          <div class="text-[10px] text-emerald-600 font-mono truncate max-w-[200px]" [title]="importDirectoryPath()">
            Pfad: {{ importDirectoryPath() }}
          </div>
        }
      </div>

      <!-- Preview Area (Screening) -->
      @if (isScreening() && previewFilesList().length > 0) {
        <div 
          class="p-4 bg-white border-b border-gray-200 overflow-y-auto shrink-0 animate-in slide-in-from-top duration-300 transition-all"
          [class.max-h-48]="!isPreviewExpanded()"
          [class.max-h-[70vh]]="isPreviewExpanded()"
        >
          <div class="flex justify-between items-center mb-3">
            <div class="flex flex-col">
              <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <mat-icon style="font-size: 16px; width: 16px; height: 16px;">preview</mat-icon>
                Vorschau der Dateien ({{ selectedFilesCount() }})
              </h3>
              @if (importDirectoryPath()) {
                <div class="text-[10px] text-emerald-600 font-mono mt-1 flex items-center gap-1">
                  <mat-icon style="font-size: 12px; width: 12px; height: 12px;">folder</mat-icon>
                  {{ importDirectoryPath() }}
                </div>
              }
            </div>
            <div class="flex items-center gap-2">
              <button 
                (click)="isPreviewExpanded.set(!isPreviewExpanded())" 
                class="text-gray-400 hover:text-blue-600 p-1 flex items-center gap-1 text-[10px] font-bold uppercase transition-colors"
                [title]="isPreviewExpanded() ? 'Verkleinern' : 'Vergrößern'"
              >
                <mat-icon style="font-size: 18px; width: 18px; height: 18px;">{{ isPreviewExpanded() ? 'unfold_less' : 'unfold_more' }}</mat-icon>
                {{ isPreviewExpanded() ? 'Verkleinern' : 'Vergrößern' }}
              </button>
              <button (click)="isScreening.set(false)" class="text-gray-400 hover:text-red-600 p-1 transition-colors">
                <mat-icon style="font-size: 18px; width: 18px; height: 18px;">close</mat-icon>
              </button>
            </div>
          </div>
          <div class="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-16 gap-2">
            @for (file of previewFilesList(); track file.name) {
              <div class="aspect-square bg-gray-100 rounded border border-gray-200 flex items-center justify-center overflow-hidden relative group shadow-sm">
                @if (file.url) {
                  <img [src]="file.url" [alt]="file.name" class="w-full h-full object-cover" referrerpolicy="no-referrer">
                } @else {
                  <mat-icon class="text-gray-300" style="font-size: 20px; width: 20px; height: 20px;">image</mat-icon>
                }
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1">
                  <span class="text-[6px] text-white truncate w-full text-center leading-tight">{{ file.name }}</span>
                </div>
              </div>
            }
          </div>
        </div>
      }
      
      <!-- Advanced Filters -->
      <div class="p-4 bg-white border-b border-gray-200 flex flex-wrap gap-4 items-center shrink-0">
        <div class="relative flex-1 min-w-[250px] max-w-md">
          <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</mat-icon>
          <input 
            type="text" 
            [(ngModel)]="searchTerm" 
            placeholder="Suchen nach Titel, Tag, Aktivität..." 
            class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
          >
        </div>

        <!-- Label Search with Voice -->
        <div class="relative flex-1 min-w-[200px] max-w-[250px]">
          <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">label</mat-icon>
          <input 
            type="text" 
            [(ngModel)]="labelSearchTerm" 
            placeholder="Nach Label filtern..." 
            class="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
          >
          <button 
            (click)="startVoiceSearch('label')"
            class="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 transition-colors"
            [class.text-emerald-600]="isListeningLabel()"
            [class.animate-pulse]="isListeningLabel()"
            title="Spracheingabe für Labels"
          >
            <mat-icon style="font-size: 18px; width: 18px; height: 18px;">{{ isListeningLabel() ? 'mic' : 'mic_none' }}</mat-icon>
          </button>
        </div>

        <!-- Title Search with Voice -->
        <div class="relative flex-1 min-w-[200px] max-w-[250px]">
          <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">title</mat-icon>
          <input 
            type="text" 
            [(ngModel)]="titleSearchTerm" 
            placeholder="Nach Überschrift filtern..." 
            class="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm"
          >
          <button 
            (click)="startVoiceSearch('title')"
            class="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 transition-colors"
            [class.text-purple-600]="isListeningTitle()"
            [class.animate-pulse]="isListeningTitle()"
            title="Spracheingabe für Überschriften"
          >
            <mat-icon style="font-size: 18px; width: 18px; height: 18px;">{{ isListeningTitle() ? 'mic' : 'mic_none' }}</mat-icon>
          </button>
        </div>
        <select [(ngModel)]="selectedPriority" class="border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm">
          <option value="">Alle Prioritäten</option>
          <option value="Hoch">Hoch</option>
          <option value="Mittel">Mittel</option>
          <option value="Niedrig">Niedrig</option>
        </select>
        <select [(ngModel)]="selectedCluster" class="border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm">
          <option value="">Alle Cluster</option>
          <option value="Marketing">Marketing</option>
          <option value="Produkt">Produkt</option>
          <option value="Event">Event</option>
          <option value="Lokal">Lokal (C:)</option>
          <option value="Netzwerk">Netzwerk (Share)</option>
        </select>
      </div>
      
      <div class="flex-1 overflow-y-auto p-6">
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          @for (img of visibleImages(); track img.id) {
            <div 
              (click)="toggleSelection(img)"
              (keydown.enter)="toggleSelection(img)"
              tabindex="0"
              [class.border-blue-500]="img.selected"
              [class.ring-2]="img.selected"
              [class.ring-blue-200]="img.selected"
              class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden group cursor-pointer flex flex-col transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400" 
              (dblclick)="openFullscreen(img)" 
              title="Klick zum Auswählen, Doppelklick für Vollbild"
            >
              <div class="aspect-square relative overflow-hidden bg-gray-100 shrink-0">
                <img [src]="img.url" [alt]="img.title" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" referrerpolicy="no-referrer">
                
                <!-- Selection Indicator -->
                <div class="absolute top-2 left-2 z-10">
                  <div 
                    class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200"
                    [class.bg-blue-600]="img.selected"
                    [class.border-blue-600]="img.selected"
                    [class.border-white]="!img.selected"
                    [class.bg-black/20]="!img.selected"
                    [class.opacity-0]="!img.selected"
                    [class.group-hover:opacity-100]="!img.selected"
                  >
                    <mat-icon class="text-white" style="font-size: 16px; width: 16px; height: 16px;">check</mat-icon>
                  </div>
                </div>

                <!-- Badges Overlay -->
                <div class="absolute top-2 left-10 flex flex-col gap-1">
                  <span class="px-2 py-0.5 text-[10px] font-bold rounded shadow-sm"
                        [class.bg-red-500]="img.priority === 'Hoch'" [class.text-white]="img.priority === 'Hoch'"
                        [class.bg-yellow-400]="img.priority === 'Mittel'" [class.text-yellow-900]="img.priority === 'Mittel'"
                        [class.bg-green-500]="img.priority === 'Niedrig'" [class.text-white]="img.priority === 'Niedrig'">
                    {{ img.priority }}
                  </span>
                </div>
                <div class="absolute top-2 right-2">
                  <span class="px-2 py-0.5 text-[10px] font-medium rounded bg-black/60 text-white backdrop-blur-sm shadow-sm">
                    {{ img.cluster }}
                  </span>
                </div>

                <!-- Hover Actions -->
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button class="bg-white text-gray-900 p-2 rounded-full hover:bg-emerald-50 hover:text-emerald-600 transition-colors" (click)="$event.stopPropagation(); openEditDialog(img)" title="Bearbeiten">
                    <mat-icon style="font-size: 20px; width: 20px; height: 20px; display: block;">edit</mat-icon>
                  </button>
                  <button class="bg-white text-gray-900 p-2 rounded-full hover:bg-purple-50 hover:text-purple-600 transition-colors" (click)="$event.stopPropagation(); analyzeImage(img)" title="KI Analyse">
                    <mat-icon [class.animate-spin]="isAnalyzing() === img.id" style="font-size: 20px; width: 20px; height: 20px; display: block;">
                      {{ isAnalyzing() === img.id ? 'autorenew' : 'auto_awesome' }}
                    </mat-icon>
                  </button>
                  <button class="bg-white text-gray-900 p-2 rounded-full hover:bg-amber-50 hover:text-amber-600 transition-colors" (click)="$event.stopPropagation(); performOCR(img)" title="Texterkennung (OCR)">
                    <mat-icon [class.animate-spin]="isOcrLoading() === img.id" style="font-size: 20px; width: 20px; height: 20px; display: block;">
                      {{ isOcrLoading() === img.id ? 'autorenew' : 'spellcheck' }}
                    </mat-icon>
                  </button>
                  <button class="bg-white text-gray-900 p-2 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors" (click)="$event.stopPropagation(); openFullscreen(img)" title="Vollbild">
                    <mat-icon style="font-size: 20px; width: 20px; height: 20px; display: block;">fullscreen</mat-icon>
                  </button>
                  <button class="bg-white text-gray-900 p-2 rounded-full hover:bg-gray-100 transition-colors" (click)="$event.stopPropagation(); shareImage(img)" title="Teilen">
                    <mat-icon style="font-size: 20px; width: 20px; height: 20px; display: block;">share</mat-icon>
                  </button>
                  <button class="bg-white text-gray-900 p-2 rounded-full hover:bg-gray-100 transition-colors" (click)="$event.stopPropagation(); downloadImage(img)" title="Herunterladen">
                    <mat-icon style="font-size: 20px; width: 20px; height: 20px; display: block;">download</mat-icon>
                  </button>
                  <button class="bg-white text-gray-900 p-2 rounded-full hover:bg-red-50 hover:text-red-600 transition-colors" (click)="$event.stopPropagation(); deleteImage(img)" title="Löschen">
                    <mat-icon style="font-size: 20px; width: 20px; height: 20px; display: block;">delete</mat-icon>
                  </button>
                </div>
              </div>
              <div class="p-4 flex-1 flex flex-col">
                <h3 class="font-medium text-gray-900 truncate" [title]="img.title">{{ img.title }}</h3>
                @if (img.sourcePath) {
                  <div class="text-[10px] text-gray-400 mt-1 truncate">
                    {{ img.sourcePath }}
                  </div>
                }
                <div class="text-xs text-gray-500 mt-1 flex justify-between">
                  <span>{{ img.activity }}</span>
                  <span>{{ img.size }}</span>
                </div>
                <div class="flex flex-wrap gap-1 mt-3 mt-auto">
                  @for (tag of img.tags; track tag) {
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                      {{ tag }}
                    </span>
                  }
                </div>
              </div>
            </div>
          }
        </div>
        
        @if (filteredImages().length === 0) {
          <div class="py-12 text-center text-gray-500 bg-white rounded-xl border border-gray-200 mt-6">
            <mat-icon class="mx-auto h-12 w-12 text-gray-400 mb-3">search_off</mat-icon>
            <p>Keine Bilder gefunden, die den Filterkriterien entsprechen.</p>
          </div>
        }

        @if (visibleCount() < filteredImages().length) {
          <div class="text-center py-6 mt-6">
            <button 
              (click)="loadMore()"
              class="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-2.5 rounded-lg font-medium transition-colors inline-flex items-center gap-2 shadow-sm"
            >
              <mat-icon>expand_more</mat-icon>
              Mehr laden ({{ filteredImages().length - visibleCount() }} weitere)
            </button>
          </div>
        }
      </div>

      <!-- Selection Actions Bar (Enhanced as .selected-image-container) -->
      @if (selectedCount() > 0) {
        <div class="selected-image-container fixed bottom-8 left-1/2 -translate-x-1/2 z-[150] bg-gray-900/95 backdrop-blur-xl text-white px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-8 animate-in slide-in-from-bottom-12 duration-500 border border-white/10 max-w-[95vw]">
          <div class="flex items-center gap-4 border-r border-white/10 pr-8">
            <div class="relative">
              <div class="bg-blue-600 text-white w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-500/30 rotate-3">
                {{ selectedCount() }}
              </div>
              <div class="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-gray-900 animate-pulse"></div>
            </div>
            <div class="flex flex-col">
              <span class="text-sm font-bold tracking-tight">Bilder ausgewählt</span>
              <button (click)="deselectAll()" class="text-[10px] text-gray-400 hover:text-white transition-colors text-left uppercase font-black tracking-widest">Auswahl aufheben</button>
            </div>
          </div>
          
          <!-- Thumbnails of selected images (Scrollable) -->
          <div class="hidden md:flex items-center gap-2 max-w-md overflow-x-auto py-1 scrollbar-hide no-scrollbar">
            @for (img of images(); track img.id) {
              @if (img.selected) {
                <div 
                  class="w-10 h-10 rounded-lg overflow-hidden border border-white/20 shrink-0 hover:scale-110 transition-transform cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  (click)="openFullscreen(img)"
                  (keydown.enter)="openFullscreen(img)"
                  tabindex="0"
                  role="button"
                  aria-label="Vollbild anzeigen"
                >
                  <img [src]="img.url" class="w-full h-full object-cover" referrerpolicy="no-referrer" alt="Vorschau">
                </div>
              }
            }
          </div>

          <div class="h-8 w-px bg-white/10 hidden md:block"></div>

          <div class="flex items-center gap-1">
            <button (click)="analyzeSelectedImages()" [disabled]="isBatchAnalyzing()" class="group p-3 hover:bg-white/10 rounded-2xl transition-all flex flex-col items-center gap-1 min-w-[72px]">
              <mat-icon [class.animate-spin]="isBatchAnalyzing()" class="group-hover:text-purple-400 transition-colors">{{ isBatchAnalyzing() ? 'autorenew' : 'auto_awesome' }}</mat-icon>
              <span class="text-[9px] uppercase font-black tracking-tighter opacity-70 group-hover:opacity-100">KI Analyse</span>
            </button>
            
            <button (click)="deleteSelectedImages()" class="group p-3 hover:bg-red-500/20 text-red-400 rounded-2xl transition-all flex flex-col items-center gap-1 min-w-[72px]">
              <mat-icon class="group-hover:scale-110 transition-transform">delete_sweep</mat-icon>
              <span class="text-[9px] uppercase font-black tracking-tighter opacity-70 group-hover:opacity-100">Löschen</span>
            </button>

            <div class="w-px h-6 bg-white/10 mx-2"></div>

            <button (click)="downloadSelectedImages()" class="group p-3 hover:bg-white/10 rounded-2xl transition-all flex flex-col items-center gap-1 min-w-[72px]">
              <mat-icon class="group-hover:text-blue-400 transition-colors">download</mat-icon>
              <span class="text-[9px] uppercase font-black tracking-tighter opacity-70 group-hover:opacity-100">Download</span>
            </button>
            
            <button (click)="shareSelectedImages()" class="group p-3 hover:bg-white/10 rounded-2xl transition-all flex flex-col items-center gap-1 min-w-[72px]">
              <mat-icon class="group-hover:text-emerald-400 transition-colors">share</mat-icon>
              <span class="text-[9px] uppercase font-black tracking-tighter opacity-70 group-hover:opacity-100">Teilen</span>
            </button>
          </div>
        </div>
      }

      <!-- Fullscreen Modal -->
      @if (fullscreenImage()) {
        <div 
          class="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4 outline-none" 
          (click)="closeFullscreen()" 
          (keydown.escape)="closeFullscreen()"
          tabindex="0"
          role="dialog"
          aria-modal="true"
        >
          <button class="absolute top-6 right-6 text-white/70 hover:text-white transition-colors" (click)="closeFullscreen()" aria-label="Schließen">
            <mat-icon style="font-size: 48px; width: 48px; height: 48px;">close</mat-icon>
          </button>
          
          <div class="max-w-7xl w-full h-full flex flex-col items-center justify-center gap-6" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()" role="document" tabindex="-1">
            <img [src]="fullscreenImage()?.url" [alt]="fullscreenImage()?.title" class="max-w-full max-h-[80vh] object-contain shadow-2xl rounded-lg" referrerpolicy="no-referrer">
            
            <div class="text-center text-white max-w-2xl">
              <h2 class="text-3xl font-bold mb-2">{{ fullscreenImage()?.title }}</h2>
              <p class="text-gray-400 text-sm mb-4">{{ fullscreenImage()?.sourcePath || 'Lokale Datei' }}</p>
              <div class="flex flex-wrap justify-center gap-2">
                @for (tag of fullscreenImage()?.tags; track tag) {
                  <span class="px-3 py-1 rounded-full bg-white/10 text-white text-sm border border-white/20">
                    {{ tag }}
                  </span>
                }
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Mass Import Modal (Removed as it's now permanent) -->

      <!-- Drive Selection Dialog -->
      @if (isDriveModalOpen()) {
        <div class="fixed inset-0 z-[130] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div class="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 class="text-xl font-bold text-gray-900 flex items-center gap-2">
                <mat-icon class="text-emerald-600">storage</mat-icon>
                Laufwerk auswählen
              </h2>
              <button (click)="closeDriveDialog()" class="text-gray-400 hover:text-gray-600 transition-colors">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            
            <div class="p-4 space-y-2">
              @for (drive of availableDrives(); track drive.id) {
                <button 
                  (click)="selectDrive(drive); closeDriveDialog()"
                  [class.bg-emerald-50]="selectedDrive()?.id === drive.id"
                  [class.text-emerald-700]="selectedDrive()?.id === drive.id"
                  [class.border-emerald-200]="selectedDrive()?.id === drive.id"
                  class="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium transition-all border border-transparent hover:bg-gray-100 text-gray-700"
                >
                  <mat-icon [class.text-emerald-600]="selectedDrive()?.id === drive.id" class="text-gray-400">{{ drive.icon }}</mat-icon>
                  <div class="text-left">
                    <div class="font-bold">{{ drive.name }}</div>
                    <div class="text-[10px] opacity-60 font-mono">{{ drive.path }}</div>
                  </div>
                  @if (selectedDrive()?.id === drive.id) {
                    <mat-icon class="ml-auto text-emerald-600">check_circle</mat-icon>
                  }
                </button>
              }
              
              <div class="pt-2">
                <button 
                  (click)="addNetworkDrive()"
                  class="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-blue-600 hover:bg-blue-50 border border-dashed border-blue-200 transition-all"
                >
                  <mat-icon>add_link</mat-icon>
                  Netzlaufwerk verbinden
                </button>
              </div>
            </div>

            <div class="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button (click)="closeDriveDialog()" class="px-6 py-2 text-gray-600 hover:text-gray-800 font-bold transition-colors">Schließen</button>
            </div>
          </div>
        </div>
      }

      <!-- AI Analysis Result Modal -->
      @if (aiAnalysisResult()) {
        <div class="fixed inset-0 z-[140] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-purple-50">
              <h2 class="text-xl font-bold text-purple-900 flex items-center gap-2">
                <mat-icon class="text-purple-600">auto_awesome</mat-icon>
                KI Analyse Ergebnis
              </h2>
              <button (click)="aiAnalysisResult.set(null)" class="text-purple-400 hover:text-purple-600 transition-colors">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            
            <div class="p-6 space-y-6">
              <div class="flex gap-4">
                <div class="w-24 h-24 rounded-lg overflow-hidden border border-gray-200 shrink-0">
                  <img [src]="aiAnalysisResult()?.img?.url" [alt]="aiAnalysisResult()?.img?.title" class="w-full h-full object-cover" referrerpolicy="no-referrer">
                </div>
                <div>
                  <h3 class="font-bold text-gray-900">{{ aiAnalysisResult()?.img?.title }}</h3>
                  <p class="text-xs text-gray-500">{{ aiAnalysisResult()?.img?.size }} • {{ aiAnalysisResult()?.img?.cluster }}</p>
                </div>
              </div>

              <div class="bg-purple-50/50 p-4 rounded-xl border border-purple-100">
                <h4 class="text-xs font-bold text-purple-700 uppercase tracking-wider mb-2">KI Beschreibung</h4>
                <textarea 
                  [ngModel]="aiAnalysisResult()?.description"
                  (ngModelChange)="updateAiResultField('description', $event)"
                  rows="3"
                  class="w-full bg-transparent text-sm text-gray-700 leading-relaxed italic outline-none border-none resize-none focus:ring-0"
                ></textarea>
              </div>

              <div>
                <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Vorgeschlagene Tags</h4>
                <div class="flex flex-wrap gap-2 mb-3">
                  @for (tag of aiAnalysisResult()?.tags; track tag; let i = $index) {
                    <span class="px-2 py-1 rounded bg-purple-100 text-purple-700 text-xs border border-purple-200 flex items-center gap-1">
                      {{ tag }}
                      <button (click)="removeAiResultTag(i)" class="hover:text-purple-900">
                        <mat-icon style="font-size: 14px; width: 14px; height: 14px;">close</mat-icon>
                      </button>
                    </span>
                  }
                </div>
                <div class="flex gap-2">
                  <input 
                    #newTagInput
                    type="text" 
                    placeholder="Tag hinzufügen..."
                    (keyup.enter)="addAiResultTag(newTagInput.value); newTagInput.value = ''"
                    class="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                  <button 
                    (click)="addAiResultTag(newTagInput.value); newTagInput.value = ''"
                    class="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold"
                  >
                    Hinzufügen
                  </button>
                </div>
              </div>
            </div>

            <div class="p-6 bg-gray-50 border-t border-gray-100 flex flex-col gap-3">
              <button 
                (click)="applyAiAnalysis()" 
                class="w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-200"
              >
                <mat-icon>check_circle</mat-icon>
                Änderungen speichern
              </button>
              <button 
                (click)="saveAiTextAsTags()" 
                class="w-full bg-white border border-purple-200 text-purple-600 hover:bg-purple-50 px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
              >
                <mat-icon>label</mat-icon>
                KI Text als Tag speichern
              </button>
              <button 
                (click)="aiAnalysisResult.set(null)" 
                class="w-full border border-gray-300 text-gray-600 hover:bg-gray-100 px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
              >
                <mat-icon>close</mat-icon>
                Verwerfen
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Batch AI Analysis Modal -->
      @if (showBatchAnalysisModal()) {
        <div class="fixed inset-0 z-[160] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col">
            <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-purple-50">
              <h2 class="text-xl font-bold text-purple-900 flex items-center gap-2">
                <mat-icon class="text-purple-600">auto_awesome_motion</mat-icon>
                KI Batch-Analyse Ergebnisse ({{ batchAnalysisResults().length }} Bilder)
              </h2>
              <button (click)="showBatchAnalysisModal.set(false)" class="text-purple-400 hover:text-purple-600 transition-colors">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            
            <div class="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50">
              @for (result of batchAnalysisResults(); track result.img.id; let resIndex = $index) {
                <div class="bg-white flex gap-6 p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all relative group">
                  <button 
                    (click)="discardBatchResult(resIndex)"
                    class="absolute top-4 right-4 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                    title="Dieses Ergebnis verwerfen"
                  >
                    <mat-icon>delete_outline</mat-icon>
                  </button>

                  <div class="w-40 h-40 rounded-xl overflow-hidden border border-gray-200 shrink-0 shadow-sm">
                    <img [src]="result.img.url" [alt]="result.img.title" class="w-full h-full object-cover" referrerpolicy="no-referrer">
                  </div>
                  
                  <div class="flex-1 min-w-0 space-y-4">
                    <div>
                      <h3 class="font-bold text-gray-900 mb-1 truncate">{{ result.img.title }}</h3>
                      <p class="text-[10px] text-gray-400 uppercase tracking-widest">{{ result.img.cluster }} • {{ result.img.size }}</p>
                    </div>

                    <div class="bg-purple-50/30 p-3 rounded-xl border border-purple-100">
                      <h4 class="text-[10px] font-bold text-purple-700 uppercase mb-1">Beschreibung</h4>
                      <textarea 
                        [ngModel]="result.description"
                        (ngModelChange)="updateBatchResultField(resIndex, 'description', $event)"
                        rows="2"
                        class="w-full bg-transparent text-sm text-gray-700 italic outline-none border-none resize-none focus:ring-0"
                      ></textarea>
                    </div>

                    <div>
                      <h4 class="text-[10px] font-bold text-gray-400 uppercase mb-2">Vorgeschlagene Tags</h4>
                      <div class="flex flex-wrap gap-2 mb-3">
                        @for (tag of result.tags; track tag; let tagIndex = $index) {
                          <span class="px-2 py-1 rounded bg-gray-100 text-gray-600 text-[11px] border border-gray-200 flex items-center gap-1 group/tag">
                            #{{ tag }}
                            <button (click)="removeBatchTag(resIndex, tagIndex)" class="opacity-0 group-hover/tag:opacity-100 hover:text-red-500 transition-opacity">
                              <mat-icon style="font-size: 12px; width: 12px; height: 12px;">close</mat-icon>
                            </button>
                          </span>
                        }
                      </div>
                      <div class="flex gap-2">
                        <input 
                          #batchTagInput
                          type="text" 
                          placeholder="Tag hinzufügen..."
                          (keyup.enter)="addBatchTag(resIndex, batchTagInput.value); batchTagInput.value = ''"
                          class="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-[11px] focus:ring-2 focus:ring-purple-500 outline-none"
                        >
                        <button 
                          (click)="addBatchTag(resIndex, batchTagInput.value); batchTagInput.value = ''"
                          class="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-[11px] font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              }
            </div>

            <div class="p-6 bg-white border-t border-gray-100 flex justify-between items-center">
              <p class="text-sm text-gray-500">
                <span class="font-bold text-purple-600">{{ batchAnalysisResults().length }}</span> Analysen zur Überprüfung
              </p>
              <div class="flex gap-3">
                <button 
                  (click)="showBatchAnalysisModal.set(false)" 
                  class="px-6 py-2 text-gray-600 hover:text-gray-800 font-bold transition-colors"
                >
                  Abbrechen
                </button>
                <button 
                  (click)="saveBatchResults()" 
                  class="bg-purple-600 hover:bg-purple-700 text-white px-8 py-2 rounded-xl font-bold transition-all shadow-lg shadow-purple-200 flex items-center gap-2"
                >
                  <mat-icon>save_alt</mat-icon>
                  Alle speichern
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- OCR Result Modal -->
      @if (ocrResult()) {
        <div class="fixed inset-0 z-[140] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-amber-50">
              <h2 class="text-xl font-bold text-amber-900 flex items-center gap-2">
                <mat-icon class="text-amber-600">spellcheck</mat-icon>
                Texterkennung (OCR)
              </h2>
              <button (click)="ocrResult.set(null)" class="text-amber-400 hover:text-amber-600 transition-colors">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            
            <div class="p-6 space-y-6">
              <div class="flex gap-4">
                <div class="w-24 h-24 rounded-lg overflow-hidden border border-gray-200 shrink-0">
                  <img [src]="ocrResult()?.img?.url" [alt]="ocrResult()?.img?.title" class="w-full h-full object-cover" referrerpolicy="no-referrer">
                </div>
                <div>
                  <h3 class="font-bold text-gray-900">{{ ocrResult()?.img?.title }}</h3>
                  <p class="text-xs text-gray-500">Extrahiere Text aus diesem Bild...</p>
                </div>
              </div>

              <div class="bg-amber-50/50 p-4 rounded-xl border border-amber-100 max-h-[300px] overflow-y-auto">
                <h4 class="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">Extrahierter Text</h4>
                <pre class="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-sans">
                  {{ ocrResult()?.text }}
                </pre>
              </div>
            </div>

            <div class="p-6 bg-gray-50 border-t border-gray-100 flex flex-col gap-3">
              <button 
                (click)="copyOcrText()" 
                class="w-full bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-200"
              >
                <mat-icon>content_copy</mat-icon>
                In Zwischenablage kopieren
              </button>
              <button 
                (click)="ocrResult.set(null)" 
                class="w-full border border-gray-300 text-gray-600 hover:bg-gray-100 px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
              >
                <mat-icon>close</mat-icon>
                Schließen
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Edit Metadata Modal -->
      @if (editingImage()) {
        <div class="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div class="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 class="text-xl font-bold text-gray-900 flex items-center gap-2">
                <mat-icon class="text-emerald-600">edit_note</mat-icon>
                Metadaten bearbeiten
              </h2>
              <button (click)="closeEditDialog()" class="text-gray-400 hover:text-gray-600 transition-colors">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            
            <div class="p-6 space-y-4">
              <div>
                <label for="editTitle" class="block text-sm font-medium text-gray-700 mb-1">Titel</label>
                <input 
                  id="editTitle"
                  type="text" 
                  [(ngModel)]="editForm().title" 
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                >
              </div>

              <div>
                <label for="editDescription" class="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                <textarea 
                  id="editDescription"
                  rows="3"
                  [(ngModel)]="editForm().description" 
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm resize-none"
                  placeholder="Geben Sie eine Beschreibung ein..."
                ></textarea>
              </div>

              <div class="relative">
                <label for="editTags" class="block text-sm font-medium text-gray-700 mb-1">Tags (kommagetrennt)</label>
                <input 
                  id="editTags"
                  type="text" 
                  [ngModel]="editForm().tags" 
                  (ngModelChange)="updateEditForm('tags', $event)"
                  placeholder="Tag1, Tag2, Tag3"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  (focus)="showSuggestions.set(true)"
                  (blur)="hideSuggestionsWithDelay()"
                  autocomplete="off"
                >
                @if (showSuggestions() && tagSuggestions().length > 0) {
                  <div class="absolute z-[130] left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                    <div class="p-2 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Vorschläge</div>
                    @for (suggestion of tagSuggestions(); track suggestion) {
                      <button 
                        (click)="selectTagSuggestion(suggestion)"
                        class="w-full text-left px-4 py-2 text-sm hover:bg-emerald-50 hover:text-emerald-700 transition-colors flex items-center gap-2"
                      >
                        <mat-icon class="text-emerald-500" style="font-size: 14px; width: 14px; height: 14px;">add_circle_outline</mat-icon>
                        {{ suggestion }}
                      </button>
                    }
                  </div>
                }
                <p class="text-[10px] text-gray-500 mt-1">Trennen Sie Tags mit Kommas voneinander.</p>
              </div>
            </div>

            <div class="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button (click)="closeEditDialog()" class="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors">Abbrechen</button>
              <button 
                (click)="saveMetadata()" 
                class="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-bold transition-all flex items-center gap-2 shadow-md"
              >
                <mat-icon>save</mat-icon>
                Speichern
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Mass Import Modal -->
      @if (isImportModalOpen()) {
        <div class="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[600px] overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col">
            <!-- Header -->
            <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
              <h2 class="text-xl font-bold text-gray-900 flex items-center gap-2">
                <mat-icon class="text-emerald-600">library_add</mat-icon>
                Massenimport & Laufwerksauswahl
              </h2>
              <button (click)="closeImportModal()" class="text-gray-400 hover:text-gray-600 transition-colors">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            
            <div class="flex-1 flex overflow-hidden">
              <!-- Sidebar: Drives -->
              <div class="w-64 bg-gray-50 border-r border-gray-100 overflow-y-auto p-4 space-y-4">
                <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider px-2">Verfügbare Laufwerke</h3>
                <div class="space-y-1">
                  @for (drive of availableDrives(); track drive.id) {
                    <button 
                      (click)="selectDrive(drive)"
                      [class.bg-emerald-50]="selectedDrive()?.id === drive.id"
                      [class.text-emerald-700]="selectedDrive()?.id === drive.id"
                      [class.border-emerald-200]="selectedDrive()?.id === drive.id"
                      class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border border-transparent hover:bg-gray-100 text-gray-700"
                    >
                      <mat-icon [class.text-emerald-600]="selectedDrive()?.id === drive.id" class="text-gray-400">{{ drive.icon }}</mat-icon>
                      <div class="text-left">
                        <div class="truncate">{{ drive.name }}</div>
                        <div class="text-[10px] opacity-60">{{ drive.path }}</div>
                      </div>
                    </button>
                  }
                </div>

                <div class="pt-4 mt-4 border-t border-gray-200">
                  <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider px-2 mb-2">Netzwerk-Ressourcen</h3>
                  <button 
                    (click)="addNetworkDrive()"
                    class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <mat-icon style="font-size: 18px; width: 18px; height: 18px;">add_link</mat-icon>
                    Netzlaufwerk verbinden
                  </button>
                </div>
              </div>

              <!-- Main Content: Directory Selection & Files -->
              <div class="flex-1 flex flex-col bg-white overflow-hidden">
                @if (!selectedDrive()) {
                  <div class="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                    <mat-icon style="font-size: 64px; width: 64px; height: 64px;" class="mb-4 opacity-20">storage</mat-icon>
                    <p class="text-lg font-medium">Bitte wählen Sie ein Laufwerk aus</p>
                    <p class="text-sm max-w-xs mt-2">Wählen Sie links ein lokales oder Netzlaufwerk aus, um den Import zu starten.</p>
                  </div>
                } @else {
                  <div class="p-6 space-y-6 overflow-y-auto flex-1">
                    <!-- Path Input -->
                    <div>
                      <label for="dirPath" class="block text-sm font-medium text-gray-700 mb-2">Zielverzeichnis auf {{ selectedDrive()?.name }}</label>
                      <div class="flex gap-2">
                        <div class="flex-1 relative">
                          <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">folder</mat-icon>
                          <input 
                            id="dirPath"
                            type="text" 
                            [(ngModel)]="importDirectoryPath" 
                            [placeholder]="selectedDrive()?.path + '\\...'" 
                            class="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                          >
                        </div>
                      </div>
                    </div>

                    <!-- File Picker -->
                    <div class="relative">
                      <label for="folderInput" class="block text-sm font-medium text-gray-700 mb-2">Ordnerinhalt einlesen</label>
                      <div 
                        class="border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer group relative"
                        [class.border-emerald-200]="selectedFilesCount() > 0"
                        [class.bg-emerald-50]="selectedFilesCount() > 0"
                        [class.border-gray-200]="selectedFilesCount() === 0"
                        [class.hover:border-emerald-400]="selectedFilesCount() === 0"
                      >
                        <input 
                          id="folderInput"
                          type="file" 
                          webkitdirectory 
                          directory 
                          multiple 
                          (change)="onFolderSelected($event)"
                          class="absolute inset-0 opacity-0 cursor-pointer z-10"
                        >
                        <mat-icon 
                          [class.text-emerald-500]="selectedFilesCount() > 0"
                          [class.text-gray-400]="selectedFilesCount() === 0"
                          class="group-hover:scale-110 transition-transform mb-3" 
                          style="font-size: 48px; width: 48px; height: 48px;"
                        >
                          {{ selectedFilesCount() > 0 ? 'folder_special' : 'folder_open' }}
                        </mat-icon>
                        <p class="text-base font-medium text-gray-700">
                          {{ selectedFilesCount() > 0 ? selectedFilesCount() + ' Bilder ausgewählt' : 'Ordner vom Laufwerk wählen' }}
                        </p>
                        <p class="text-xs text-gray-400 mt-1">Klicken Sie hier, um den Explorer zu öffnen</p>
                      </div>
                    </div>
                    
                    <!-- File Statistics -->
                    @if (selectedFilesCount() > 0) {
                      <div class="bg-gray-50 rounded-xl p-4 border border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
                        <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <mat-icon style="font-size: 14px; width: 14px; height: 14px;">analytics</mat-icon>
                          Dateistatistik
                        </h4>
                        <div class="flex flex-wrap gap-2">
                          @for (stat of fileExtensionStats(); track stat.ext) {
                            <div class="bg-white border border-gray-200 rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-sm">
                              <span class="text-[10px] font-bold text-gray-400 uppercase">.{{ stat.ext }}</span>
                              <span class="text-sm font-bold text-gray-900">{{ stat.count }}</span>
                            </div>
                          }
                        </div>
                      </div>
                    }
                    
                    <!-- Action Buttons in Main Mask -->
                    @if (selectedFilesCount() > 0 && !isImporting()) {
                      <div class="flex gap-4 p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                        <button 
                          (click)="screenImages()" 
                          class="flex-1 bg-white text-blue-700 hover:bg-blue-50 px-4 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 border border-blue-200 shadow-sm"
                        >
                          <mat-icon>grid_view</mat-icon> Bilder screenen
                        </button>
                        <button 
                          (click)="startMassImport()" 
                          class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-200/50"
                        >
                          <mat-icon>publish</mat-icon> Import starten
                        </button>
                      </div>
                    }

                    @if (selectedFilesCount() > 0) {
                      <div class="space-y-3">
                        <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider">Vorschau der Dateien</h4>
                        <div class="grid grid-cols-5 gap-2">
                          @for (file of previewFilesList(); track file.name) {
                            <div class="aspect-square bg-gray-100 rounded border border-gray-200 flex items-center justify-center overflow-hidden relative group">
                              <mat-icon class="text-gray-300">image</mat-icon>
                              <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span class="text-[8px] text-white px-1 truncate w-full text-center">{{ file.name }}</span>
                              </div>
                            </div>
                          }
                          @if (selectedFilesCount() > 10) {
                            <div class="aspect-square bg-gray-50 rounded border border-dashed border-gray-200 flex items-center justify-center text-[10px] text-gray-400">
                              +{{ selectedFilesCount() - 10 }}
                            </div>
                          }
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>

            <!-- Footer -->
            <div class="p-4 bg-gray-50 border-t border-gray-100 flex flex-col gap-2">
              <div class="flex justify-between items-center">
                <div class="flex items-center gap-2 text-[10px] text-gray-400">
                  <mat-icon class="text-[12px] w-[12px] h-[12px]">verified_user</mat-icon>
                  <span>Sichere Google Cloud & Firebase Umgebung (europe-west2)</span>
                </div>
                <button (click)="closeImportModal()" class="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors">Abbrechen</button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Delete Confirmation Modal -->
      @if (showDeleteConfirm()) {
        <div class="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-red-50">
              <h2 class="text-xl font-bold text-red-900 flex items-center gap-2">
                <mat-icon class="text-red-600">warning</mat-icon>
                Löschen bestätigen
              </h2>
              <button (click)="showDeleteConfirm.set(false)" class="text-red-400 hover:text-red-600 transition-colors">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            
            <div class="p-6">
              <p class="text-gray-700">
                @if (deleteConfirmData()?.type === 'single') {
                  Möchten Sie das Bild <strong>"{{ deleteConfirmData()?.img?.title }}"</strong> wirklich unwiderruflich löschen?
                } @else {
                  Möchten Sie die <strong>{{ deleteConfirmData()?.count }}</strong> ausgewählten Bilder wirklich unwiderruflich löschen?
                }
              </p>
              <p class="text-xs text-red-500 mt-4 flex items-center gap-1 font-medium">
                <mat-icon style="font-size: 14px; width: 14px; height: 14px;">info</mat-icon>
                Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
            </div>

            <div class="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button (click)="showDeleteConfirm.set(false)" class="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors">Abbrechen</button>
              <button 
                (click)="confirmDelete()" 
                class="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold transition-all flex items-center gap-2 shadow-md shadow-red-200"
              >
                <mat-icon>delete_forever</mat-icon>
                Löschen
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class ImagesComponent {
  geminiService = inject(GeminiService);
  toastService = inject(ToastService);

  searchTerm = signal('');
  labelSearchTerm = signal('');
  titleSearchTerm = signal('');
  isListeningLabel = signal(false);
  isListeningTitle = signal(false);
  selectedPriority = signal('');
  selectedCluster = signal('');
  isAnalyzing = signal<string | null>(null);
  isScanning = signal<boolean>(false);
  isImportModalOpen = signal<boolean>(false);
  isDriveModalOpen = signal<boolean>(false);
  isPreviewExpanded = signal<boolean>(false);
  aiAnalysisResult = signal<{ img: Image, description: string, tags: string[] } | null>(null);
  ocrResult = signal<{ img: Image, text: string } | null>(null);
  isOcrLoading = signal<string | null>(null);
  editingImage = signal<Image | null>(null);
  editForm = signal({ title: '', description: '', tags: '' });
  showSuggestions = signal(false);
  showDeleteConfirm = signal(false);
  deleteConfirmData = signal<{ type: 'single' | 'batch', img?: Image, count?: number } | null>(null);

  allTags = computed(() => {
    const tags = new Set<string>();
    this.images().forEach(img => {
      img.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  });

  tagSuggestions = computed(() => {
    const fullInput = this.editForm().tags;
    if (typeof fullInput !== 'string') return [];
    
    const tags = fullInput.split(',').map(t => t.trim());
    const lastTag = tags[tags.length - 1].toLowerCase();
    
    if (!lastTag) return [];
    
    const existingTagsInInput = new Set(tags.slice(0, -1).map(t => t.toLowerCase()));
    
    return this.allTags().filter(t => 
      t.toLowerCase().includes(lastTag) && !existingTagsInInput.has(t.toLowerCase())
    ).slice(0, 5);
  });

  importDirectoryPath = signal<string>('');
  isImporting = signal<boolean>(false);
  isScreening = signal<boolean>(false);
  selectedFilesCount = signal<number>(0);
  selectedDrive = signal<Drive | null>(null);
  user = signal<User | null>(null);
  isAuthReady = signal(false);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private activeRecognition: any = null;
  private lastVoiceType: 'label' | 'title' = 'title';
  private isRequestingPermission = false;
  micPermissionStatus = signal<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');

  isBatchAnalyzing = signal(false);
  batchAnalysisResults = signal<{img: Image, description: string, tags: string[]}[]>([]);
  showBatchAnalysisModal = signal(false);

  availableDrives = signal<Drive[]>([
    { id: 'c', name: 'Lokaler Datenträger (C:)', path: 'C:', icon: 'computer' },
    { id: 'd', name: 'Daten (D:)', path: 'D:', icon: 'storage' },
    { id: 'network', name: 'Unternehmens-Share', path: '\\\\sstr119f.edc.corpintra.net\\AZEHNPF$', icon: 'dns' },
    { id: 'usb', name: 'Wechseldatenträger (E:)', path: 'E:', icon: 'usb' }
  ]);

  private selectedFiles = signal<FileList | null>(null);
  private previewUrls: string[] = [];
  
  fileExtensionStats = computed(() => {
    const currentFiles = this.selectedFiles();
    if (!currentFiles) return [];
    
    const stats: Record<string, number> = {};
    Array.from(currentFiles).forEach(file => {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'unbekannt';
      stats[ext] = (stats[ext] || 0) + 1;
    });
    
    return Object.entries(stats)
      .map(([ext, count]) => ({ ext, count }))
      .sort((a, b) => b.count - a.count);
  });

  previewFilesList = computed(() => {
    // Revoke old URLs to prevent memory leaks
    this.previewUrls.forEach(url => URL.revokeObjectURL(url));
    this.previewUrls = [];

    const currentFiles = this.selectedFiles();
    if (!currentFiles) return [];
    
    const files = Array.from(currentFiles).filter(file => 
      file.type.startsWith('image/') || 
      /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name)
    );
    
    const list = this.isScreening() ? files : files.slice(0, 10);
    
    return list.map(file => {
      const url = URL.createObjectURL(file);
      this.previewUrls.push(url);
      return {
        name: file.name,
        url: url
      };
    });
  });

  visibleCount = signal<number>(20);
  fullscreenImage = signal<Image | null>(null);
  selectedCount = computed(() => this.images().filter(img => img.selected).length);

  constructor() {
    this.checkMicrophonePermission();
    
    // Initialize Firebase Auth
    onAuthStateChanged(auth, (user: User | null) => {
      this.user.set(user);
      this.isAuthReady.set(true);
      
      if (user) {
        this.setupFirestoreListener(user.uid);
      } else {
        this.images.set([]);
      }
    });
  }

  private setupFirestoreListener(uid: string) {
    const q = query(collection(db, 'images'), where('uid', '==', uid));
    onSnapshot(q, (snapshot: QuerySnapshot) => {
      const imgs = snapshot.docs.map((doc: QueryDocumentSnapshot) => {
        const data = doc.data();
        return {
          ...data,
          date: new Date(data['date']),
          selected: false
        } as Image;
      });
      // Sort by date descending
      imgs.sort((a: Image, b: Image) => b.date.getTime() - a.date.getTime());
      this.images.set(imgs);
    }, (error: Error) => {
      handleFirestoreError(error, OperationType.LIST, 'images');
    });
  }

  async login() {
    try {
      await signInWithPopup(auth, googleProvider);
      this.toastService.show('Erfolgreich angemeldet!', 'success');
    } catch (error) {
      console.error('Login failed:', error);
      this.toastService.show('Anmeldung fehlgeschlagen.', 'error');
    }
  }

  async logout() {
    try {
      await signOut(auth);
      this.toastService.show('Abgemeldet.', 'info');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  async checkMicrophonePermission() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (navigator.permissions && (navigator.permissions as any).query) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await navigator.permissions.query({ name: 'microphone' as any });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.micPermissionStatus.set(result.state as any);
        if (result.state === 'denied') {
          this.toastService.show('Mikrofonzugriff ist blockiert. Bitte in den Browsereinstellungen freischalten.', 'info');
        }
        result.onchange = () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          this.micPermissionStatus.set(result.state as any);
          if (result.state === 'granted') {
            this.toastService.show('Mikrofonzugriff erlaubt!', 'success');
          }
        };
      } catch (e) {
        console.warn('Permissions API not supported for microphone', e);
      }
    }
  }

  openInNewTab() {
    window.open(window.location.href, '_blank');
  }

  images = signal<Image[]>([]);

  filteredImages = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const labelTerm = this.labelSearchTerm().toLowerCase();
    const titleTerm = this.titleSearchTerm().toLowerCase();
    const prio = this.selectedPriority();
    const cluster = this.selectedCluster();

    return this.images().filter(img => {
      const matchesSearch = !term || 
        img.title.toLowerCase().includes(term) || 
        img.activity.toLowerCase().includes(term) ||
        img.tags.some(t => t.toLowerCase().includes(term));
      
      const matchesLabel = !labelTerm || 
        img.tags.some(t => t.toLowerCase().includes(labelTerm));
      
      const matchesTitle = !titleTerm || 
        img.title.toLowerCase().includes(titleTerm);
      
      const matchesPriority = !prio || img.priority === prio;
      const matchesCluster = !cluster || img.cluster === cluster;

      return matchesSearch && matchesLabel && matchesTitle && matchesPriority && matchesCluster;
    });
  });

  visibleImages = computed(() => {
    return this.filteredImages().slice(0, this.visibleCount());
  });

  loadMore() {
    this.visibleCount.update(c => c + 20);
  }

  openFullscreen(img: Image) {
    this.fullscreenImage.set(img);
  }

  closeFullscreen() {
    this.fullscreenImage.set(null);
  }

  openEditDialog(img: Image) {
    this.editingImage.set(img);
    this.editForm.set({
      title: img.title,
      description: img.description || '',
      tags: img.tags.join(', ')
    });
  }

  closeEditDialog() {
    this.editingImage.set(null);
    this.showSuggestions.set(false);
  }

  updateEditForm(field: string, value: string) {
    this.editForm.update(form => ({ ...form, [field]: value }));
  }

  hideSuggestionsWithDelay() {
    setTimeout(() => this.showSuggestions.set(false), 200);
  }

  selectTagSuggestion(suggestion: string) {
    const fullInput = this.editForm().tags;
    const tags = fullInput.split(',').map(t => t.trim());
    tags[tags.length - 1] = suggestion;
    const newValue = tags.join(', ') + ', ';
    this.editForm.update(form => ({ ...form, tags: newValue }));
    this.showSuggestions.set(false);
    
    // Refocus input
    setTimeout(() => {
      const input = document.getElementById('editTags');
      if (input) input.focus();
    }, 0);
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.code === 'Space') {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      event.preventDefault();
      if (!this.isListeningLabel() && !this.isListeningTitle()) {
        this.startVoiceSearch(this.lastVoiceType);
      }
    }
  }

  onKeyUp(event: KeyboardEvent) {
    if (event.code === 'Space') {
      if (this.activeRecognition) {
        this.activeRecognition.stop();
      }
    }
  }

  toggleSelection(img: Image) {
    this.images.update(imgs => imgs.map(i => 
      i.id === img.id ? { ...i, selected: !i.selected } : i
    ));
  }

  selectAllFiltered() {
    const filteredIds = new Set(this.filteredImages().map(img => img.id));
    this.images.update(imgs => imgs.map(img => 
      filteredIds.has(img.id) ? { ...img, selected: true } : img
    ));
    this.toastService.show(`${filteredIds.size} Bilder ausgewählt.`, 'success');
  }

  deselectAll() {
    this.images.update(imgs => imgs.map(img => ({ ...img, selected: false })));
    this.toastService.show('Auswahl aufgehoben.', 'info');
  }

  async startVoiceSearch(type: 'label' | 'title') {
    if (this.isRequestingPermission) return;
    this.lastVoiceType = type;

    // If we already know it's denied, show help immediately
    if (this.micPermissionStatus() === 'denied') {
      this.toastService.show('Mikrofonzugriff ist blockiert. Bitte klicke auf das Schloss-Icon oder öffne die App in einem neuen Tab.', 'error');
      return;
    }
    
    // Explicitly request microphone permission if not already granted
    if (this.micPermissionStatus() !== 'granted') {
      try {
        this.isRequestingPermission = true;
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately
        this.isRequestingPermission = false;
        this.micPermissionStatus.set('granted');
      } catch (err) {
        console.error('Microphone access denied', err);
        this.isRequestingPermission = false;
        this.micPermissionStatus.set('denied');
        this.toastService.show('Mikrofonzugriff verweigert. Bitte Berechtigungen prüfen oder neuen Tab nutzen.', 'error');
        return;
      }
    }

    this.initiateRecognition(type);
  }

  private initiateRecognition(type: 'label' | 'title') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.toastService.show('Spracherkennung wird von diesem Browser nicht unterstützt.', 'error');
      return;
    }

    const recognition = new SpeechRecognition();
    this.activeRecognition = recognition;
    recognition.lang = 'de-DE';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    if (type === 'label') this.isListeningLabel.set(true);
    else this.isListeningTitle.set(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      
      // Check for selection commands
      if (transcript.startsWith('wähle') || transcript.startsWith('markiere') || transcript.startsWith('selektiere')) {
        const target = transcript.replace(/^(wähle|markiere|selektiere)\s+/, '').trim();
        
        if (target === 'alle' || target === 'alles') {
          this.selectAllFiltered();
          return;
        }

        const found = this.images().find(img => img.title.toLowerCase().includes(target));
        if (found) {
          this.toggleSelection(found);
          this.toastService.show(`"${found.title}" ausgewählt.`, 'success');
          return;
        }
      }

      if (type === 'label') {
        this.labelSearchTerm.set(transcript);
      } else {
        this.titleSearchTerm.set(transcript);
      }
      this.toastService.show(`Erkannt: "${transcript}"`, 'success');
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      if (event.error === 'not-allowed') {
        this.toastService.show('Mikrofonzugriff verweigert. Bitte klicke auf das Schloss-Icon oder öffne die App in einem neuen Tab.', 'error');
        this.micPermissionStatus.set('denied');
      } else if (event.error !== 'aborted') {
        this.toastService.show('Spracherkennung fehlgeschlagen: ' + event.error, 'error');
      }
      if (type === 'label') this.isListeningLabel.set(false);
      else this.isListeningTitle.set(false);
    };

    recognition.onend = () => {
      if (type === 'label') this.isListeningLabel.set(false);
      else this.isListeningTitle.set(false);
      this.activeRecognition = null;
    };

    try {
      recognition.start();
    } catch (e) {
      console.error('Recognition start error', e);
      if (type === 'label') this.isListeningLabel.set(false);
      else this.isListeningTitle.set(false);
      this.activeRecognition = null;
    }
  }

  async saveMetadata() {
    const currentImg = this.editingImage();
    if (!currentImg) return;

    const form = this.editForm();
    const updatedTags = form.tags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    try {
      await updateDoc(doc(db, 'images', currentImg.id), {
        title: form.title,
        description: form.description,
        tags: updatedTags
      });
      this.toastService.show(`Metadaten für "${form.title}" gespeichert.`, 'success');
      this.closeEditDialog();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `images/${currentImg.id}`);
    }
  }

  openDriveDialog() {
    this.isDriveModalOpen.set(true);
  }

  closeDriveDialog() {
    this.isDriveModalOpen.set(false);
  }

  selectDrive(drive: Drive) {
    this.selectedDrive.set(drive);
    this.importDirectoryPath.set(drive.path);
    this.selectedFilesCount.set(0);
    this.selectedFiles.set(null);
    this.isScreening.set(false);
  }

  addNetworkDrive() {
    const path = prompt('Bitte geben Sie den Netzwerkpfad ein (z.B. \\\\server\\share):');
    if (path) {
      const newDrive = { 
        id: 'net-' + Date.now(), 
        name: 'Netzwerk: ' + path.split('\\').pop(), 
        path: path, 
        icon: 'cloud_queue' 
      };
      this.availableDrives.update(d => [...d, newDrive]);
      this.selectDrive(newDrive);
    }
  }

  closeImportModal() {
    if (this.isImporting()) return;
    this.isImportModalOpen.set(false);
  }

  onFolderSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;

    this.isScreening.set(false);
    // Filter for image files only (by MIME type or extension)
    const imageFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/') || 
      /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name)
    );
    
    this.selectedFiles.set(files); 
    this.selectedFilesCount.set(imageFiles.length);
    
    // Update directory path based on selection if possible
    if (files.length > 0 && files[0].webkitRelativePath) {
      const parts = files[0].webkitRelativePath.split('/');
      if (parts.length > 1) {
        const folderName = parts[0];
        const currentDrive = this.selectedDrive();
        if (currentDrive) {
          this.importDirectoryPath.set(`${currentDrive.path}\\${folderName}`);
        }
      }
    }
    
    if (imageFiles.length === 0) {
      this.toastService.show('Keine gültigen Bilddateien im gewählten Ordner gefunden.', 'info');
    }
  }

  async startMassImport() {
    const files = this.selectedFiles();
    if (!files || this.selectedFilesCount() === 0) {
      this.toastService.show('Bitte wählen Sie zuerst einen Ordner mit Bildern aus.', 'info');
      return;
    }
    
    this.isScreening.set(false);
    this.isImporting.set(true);
    const path = this.importDirectoryPath();
    const filesArray = Array.from(files).filter(file => 
      file.type.startsWith('image/') || 
      /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name)
    );
    
    try {
      this.toastService.show(`Massenimport von ${filesArray.length} Bildern gestartet...`, 'info');

      const currentUser = this.user();
      if (!currentUser) {
        this.toastService.show('Bitte melden Sie sich an, um Bilder zu importieren.', 'error');
        return;
      }

      // Process in larger chunks using batch AI analysis
      const chunkSize = 10; // Smaller chunk size for storage uploads
      for (let i = 0; i < filesArray.length; i += chunkSize) {
        const chunk = filesArray.slice(i, i + chunkSize);
        const titles = chunk.map(f => f.name);
        
        // Batch analyze all filenames in this chunk
        const aiResults = await this.geminiService.batchAnalyzeImageMetadata(titles);
        
        for (const file of chunk) {
          const result = aiResults[file.name] || { description: 'Keine Analyse verfügbar', tags: [] };
          const id = Math.random().toString(36).substr(2, 9);
          
          // Upload to Firebase Storage
          const storageRef = ref(storage, `images/${currentUser.uid}/${id}_${file.name}`);
          const uploadResult = await uploadBytes(storageRef, file);
          const downloadUrl = await getDownloadURL(uploadResult.ref);
          
          const newImage: Image = {
            id: id,
            uid: currentUser.uid,
            url: downloadUrl,
            title: file.name,
            tags: result.tags,
            description: result.description,
            priority: 'Mittel',
            activity: 'Massenimport',
            cluster: 'Import',
            subcluster: 'Lokal',
            date: new Date(),
            size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
            sourcePath: `${path}\\${file.name}`
          };

          // Save to Firestore
          try {
            await setDoc(doc(db, 'images', id), {
              ...newImage,
              date: newImage.date.toISOString()
            });
          } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, `images/${id}`);
          }
        }
        
        if (filesArray.length > chunkSize) {
          this.toastService.show(`Verarbeite Bilder: ${Math.min(i + chunkSize, filesArray.length)} von ${filesArray.length}`, 'info');
        }
      }

      this.toastService.show(`${filesArray.length} Bilder erfolgreich aus "${path}" importiert.`, 'success');
      this.selectedFiles.set(null);
      this.selectedFilesCount.set(0);
      this.isScreening.set(false);
    } catch (error) {
      console.error('Mass import failed:', error);
      this.toastService.show('Fehler beim Massenimport. Bitte versuchen Sie es erneut.', 'error');
    } finally {
      this.isImporting.set(false);
    }
  }

  screenImages() {
    if (this.selectedFilesCount() > 0) {
      this.isScreening.set(true);
      this.toastService.show('Vorschau aller Bilder wird geladen...', 'info');
    }
  }

  triggerFileUpload() {
    const fileInput = document.querySelector('input[type="file"]:not([webkitdirectory])') as HTMLInputElement;
    if (fileInput) fileInput.click();
  }

  async onFilesUploaded(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;

    const currentUser = this.user();
    if (!currentUser) {
      this.toastService.show('Bitte melden Sie sich an, um Bilder hochzuladen.', 'error');
      return;
    }

    this.toastService.show(`${files.length} Bilder werden hochgeladen...`, 'info');
    
    const filesArray = Array.from(files).filter(f => f.type.startsWith('image/'));
    const titles = filesArray.map(f => f.name);
    
    // Batch analyze all uploaded files
    const aiResults = await this.geminiService.batchAnalyzeImageMetadata(titles);
    
    for (const file of filesArray) {
      const result = aiResults[file.name] || { description: 'Keine Analyse verfügbar', tags: [] };
      const id = Math.random().toString(36).substr(2, 9);
      
      // Upload to Firebase Storage
      const storageRef = ref(storage, `images/${currentUser.uid}/${id}_${file.name}`);
      const uploadResult = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(uploadResult.ref);
      
      const newImage: Image = {
        id: id,
        uid: currentUser.uid,
        url: downloadUrl,
        title: file.name,
        tags: result.tags,
        description: result.description,
        priority: 'Mittel',
        activity: 'Manueller Upload',
        cluster: 'Upload',
        subcluster: 'Direkt',
        date: new Date(),
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        sourcePath: 'Manueller Upload'
      };

      try {
        await setDoc(doc(db, 'images', id), {
          ...newImage,
          date: newImage.date.toISOString()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `images/${id}`);
      }
    }
    
    this.toastService.show(`${filesArray.length} Bilder erfolgreich hochgeladen.`, 'success');
  }

  shareImage(img: Image) {
    if (navigator.share) {
      navigator.share({
        title: img.title,
        text: img.description || 'Schau dir dieses Bild an!',
        url: img.url
      }).catch(err => console.error('Error sharing:', err));
    } else {
      navigator.clipboard.writeText(img.url);
      this.toastService.show('Bild-Link wurde in die Zwischenablage kopiert.', 'success');
    }
  }

  downloadImage(img: Image) {
    const link = document.createElement('a');
    link.href = img.url;
    link.download = img.title;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.toastService.show(`Download für "${img.title}" gestartet.`, 'success');
  }

  async deleteImage(img: Image, skipConfirm = false) {
    if (!skipConfirm) {
      this.deleteConfirmData.set({ type: 'single', img });
      this.showDeleteConfirm.set(true);
      return;
    }
    try {
      // Delete from Firestore
      await deleteDoc(doc(db, 'images', img.id));
      
      // Try to delete from Storage if it's a storage URL
      if (img.url.includes('firebasestorage.googleapis.com')) {
        try {
          const storageRef = ref(storage, img.url);
          await deleteObject(storageRef);
        } catch (e) {
          console.warn('Could not delete file from storage:', e);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `images/${img.id}`);
    }
  }

  async deleteSelectedImages() {
    const selected = this.images().filter(img => img.selected);
    if (selected.length === 0) return;

    this.deleteConfirmData.set({ type: 'batch', count: selected.length });
    this.showDeleteConfirm.set(true);
  }

  async confirmDelete() {
    const data = this.deleteConfirmData();
    if (!data) return;
    
    this.showDeleteConfirm.set(false);
    
    if (data.type === 'single' && data.img) {
      await this.deleteImage(data.img, true);
      this.toastService.show(`Bild "${data.img.title}" wurde gelöscht.`, 'success');
    } else if (data.type === 'batch') {
      const selected = this.images().filter(img => img.selected);
      this.toastService.show(`${selected.length} Bilder werden gelöscht...`, 'info');

      try {
        const deletePromises = selected.map(img => this.deleteImage(img, true));
        await Promise.all(deletePromises);
        this.toastService.show(`${selected.length} Bilder erfolgreich gelöscht.`, 'success');
      } catch (error) {
        console.error('Batch delete failed:', error);
        this.toastService.show('Fehler beim Löschen der Bilder.', 'error');
      }
    }
    this.deleteConfirmData.set(null);
  }

  async downloadSelectedImages() {
    const selected = this.images().filter(img => img.selected);
    if (selected.length === 0) return;
    
    this.toastService.show(`Vorbereitung des Downloads für ${selected.length} Bilder...`, 'info');
    
    try {
      const zip = new JSZip();
      const folder = zip.folder('ausgewaehlte_bilder');
      
      if (!folder) throw new Error('Could not create zip folder');

      const downloadPromises = selected.map(async (img) => {
        try {
          const response = await fetch(img.url);
          const blob = await response.blob();
          const fileName = img.title || `image_${img.id}.jpg`;
          folder.file(fileName, blob);
        } catch (err) {
          console.error(`Error downloading image ${img.title}:`, err);
        }
      });

      await Promise.all(downloadPromises);
      
      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `bilder_export_${new Date().getTime()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      this.toastService.show(`${selected.length} Bilder wurden erfolgreich als ZIP heruntergeladen.`, 'success');
    } catch (error) {
      console.error('ZIP download failed:', error);
      this.toastService.show('Fehler beim Erstellen des ZIP-Archivs.', 'error');
    }
  }

  shareSelectedImages() {
    const selected = this.images().filter(img => img.selected);
    if (selected.length === 0) return;
    
    const urls = selected.map(img => img.url).join('\n');
    
    if (navigator.share) {
      navigator.share({
        title: 'Ausgewählte Bilder',
        text: `Hier sind ${selected.length} Bilder aus meiner Bilddatenbank.`,
        url: selected[0].url // Share first URL as primary
      }).catch(err => console.error('Error sharing:', err));
    } else {
      navigator.clipboard.writeText(urls);
      this.toastService.show(`${selected.length} Bild-Links wurden in die Zwischenablage kopiert.`, 'success');
    }
  }

  async scanFolders() {
    const currentUser = this.user();
    if (!currentUser) {
      this.toastService.show('Bitte melden Sie sich an, um Verzeichnisse zu scannen.', 'error');
      return;
    }

    this.isScanning.set(true);
    this.toastService.show('Scanne Verzeichnisse: C:\\Bilder und Netzwerk-Share...', 'info');
    
    // Simulate a delay for scanning
    await new Promise(resolve => setTimeout(resolve, 2000));

    const mockFoundImages = [
      { title: 'Urlaub 2025', path: 'C:\\Bilder\\Urlaub\\Strand.jpg', cluster: 'Lokal' },
      { title: 'Projekt-Planung', path: '\\\\sstr119f.edc.corpintra.net\\AZEHNPF$\\Data\\My Documents\\My Pictures\\Plan.png', cluster: 'Netzwerk' },
      { title: 'Familienfoto', path: 'C:\\Bilder\\Privat\\Family.jpg', cluster: 'Lokal' },
      { title: 'Screenshot-AZE', path: '\\\\sstr119f.edc.corpintra.net\\AZEHNPF$\\Data\\My Documents\\My Pictures\\Screenshot.jpg', cluster: 'Netzwerk' }
    ];

    const titles = mockFoundImages.map(item => item.title);
    const aiResults = await this.geminiService.batchAnalyzeImageMetadata(titles);

    for (const item of mockFoundImages) {
      const result = aiResults[item.title] || { description: 'Keine Analyse verfügbar', tags: [] };
      const id = Math.random().toString(36).substr(2, 9);
      
      const newImage: Image = {
        id: id,
        uid: currentUser.uid,
        url: `https://picsum.photos/seed/${encodeURIComponent(item.title)}/800/800`,
        title: item.title,
        tags: result.tags,
        description: result.description,
        priority: 'Mittel',
        activity: 'Neu eingelesen',
        cluster: item.cluster,
        subcluster: 'Import',
        date: new Date(),
        size: '2.5 MB',
        sourcePath: item.path
      };

      try {
        await setDoc(doc(db, 'images', id), {
          ...newImage,
          date: newImage.date.toISOString()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `images/${id}`);
      }
    }

    this.isScanning.set(false);
    this.toastService.show(`${mockFoundImages.length} Bilder erfolgreich aus lokalen Verzeichnissen eingelesen und mit KI-Beschreibungen versehen.`, 'success');
  }

  async performOCR(img: Image) {
    this.isOcrLoading.set(img.id);
    try {
      const text = await this.geminiService.extractTextFromImage(img.url);
      this.ocrResult.set({ img, text });
      this.toastService.show('Texterkennung abgeschlossen.', 'success');
    } catch (error) {
      console.error('OCR failed:', error);
      this.toastService.show('Texterkennung fehlgeschlagen.', 'error');
    } finally {
      this.isOcrLoading.set(null);
    }
  }

  async copyOcrText() {
    const result = this.ocrResult();
    if (!result) return;
    
    try {
      await navigator.clipboard.writeText(result.text);
      this.toastService.show('Text in Zwischenablage kopiert!', 'success');
    } catch (err) {
      console.error('Failed to copy text:', err);
      this.toastService.show('Kopieren fehlgeschlagen.', 'error');
    }
  }

  async analyzeImage(img: Image) {
    this.isAnalyzing.set(img.id);
    try {
      const result = await this.geminiService.analyzeImageMetadata(img.title, img.url);
      
      // Open the result modal for review instead of saving immediately
      this.aiAnalysisResult.set({
        img,
        description: result.description,
        tags: result.tags
      });
    } catch (error) {
      console.error('AI Analysis failed:', error);
      this.toastService.show('KI Analyse fehlgeschlagen.', 'error');
    } finally {
      this.isAnalyzing.set(null);
    }
  }

  updateAiResultField(field: 'description' | 'tags', value: string | string[]) {
    this.aiAnalysisResult.update(res => {
      if (!res) return null;
      if (field === 'description' && typeof value === 'string') {
        return { ...res, description: value };
      }
      if (field === 'tags' && Array.isArray(value)) {
        return { ...res, tags: value };
      }
      return res;
    });
  }

  removeAiResultTag(index: number) {
    this.aiAnalysisResult.update(res => {
      if (!res) return null;
      const newTags = [...res.tags];
      newTags.splice(index, 1);
      return { ...res, tags: newTags };
    });
  }

  addAiResultTag(tag: string) {
    const trimmed = tag.trim();
    if (!trimmed) return;
    this.aiAnalysisResult.update(res => {
      if (!res) return null;
      if (res.tags.includes(trimmed)) return res;
      return { ...res, tags: [...res.tags, trimmed] };
    });
  }

  async applyAiAnalysis() {
    const result = this.aiAnalysisResult();
    if (!result) return;
    
    const newTags = Array.from(new Set([...result.img.tags, ...result.tags]));
    
    try {
      await updateDoc(doc(db, 'images', result.img.id), {
        tags: newTags,
        description: result.description
      });
      this.toastService.show(`Analyse für "${result.img.title}" gespeichert.`, 'success');
      this.aiAnalysisResult.set(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `images/${result.img.id}`);
    }
  }

  async saveAiTextAsTags() {
    const result = this.aiAnalysisResult();
    if (!result) return;
    
    const newTags = Array.from(new Set([...result.img.tags, result.description]));
    
    try {
      await updateDoc(doc(db, 'images', result.img.id), {
        tags: newTags
      });
      this.toastService.show('KI-Beschreibung wurde als Tag hinzugefügt.', 'success');
      this.aiAnalysisResult.set(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `images/${result.img.id}`);
    }
  }

  async analyzeSelectedImages() {
    const selected = this.images().filter(img => img.selected);
    if (selected.length === 0) return;

    this.isBatchAnalyzing.set(true);
    this.toastService.show(`KI-Analyse für ${selected.length} Bilder gestartet...`, 'info');

    try {
      const titles = selected.map(img => img.title);
      const results = await this.geminiService.batchAnalyzeImageMetadata(titles);
      
      const analysisData = selected.map(img => {
        const res = results[img.title] || { description: 'Keine Analyse verfügbar', tags: [] };
        return {
          img,
          description: res.description,
          tags: res.tags
        };
      });

      // Just set the results for review in the modal
      this.batchAnalysisResults.set(analysisData);
      this.showBatchAnalysisModal.set(true);
      this.toastService.show('KI Batch-Analyse abgeschlossen. Bitte Ergebnisse prüfen.', 'success');
    } catch (error) {
      console.error('Batch AI Analysis failed:', error);
      this.toastService.show('KI Batch-Analyse fehlgeschlagen.', 'error');
    } finally {
      this.isBatchAnalyzing.set(false);
    }
  }

  updateBatchResultField(index: number, field: 'description' | 'tags', value: string | string[]) {
    this.batchAnalysisResults.update(results => {
      const newResults = [...results];
      if (field === 'description' && typeof value === 'string') {
        newResults[index] = { ...newResults[index], description: value };
      } else if (field === 'tags' && Array.isArray(value)) {
        newResults[index] = { ...newResults[index], tags: value };
      }
      return newResults;
    });
  }

  removeBatchTag(resultIndex: number, tagIndex: number) {
    this.batchAnalysisResults.update(results => {
      const newResults = [...results];
      const newTags = [...newResults[resultIndex].tags];
      newTags.splice(tagIndex, 1);
      newResults[resultIndex] = { ...newResults[resultIndex], tags: newTags };
      return newResults;
    });
  }

  addBatchTag(resultIndex: number, tag: string) {
    const trimmed = tag.trim();
    if (!trimmed) return;
    this.batchAnalysisResults.update(results => {
      const newResults = [...results];
      if (newResults[resultIndex].tags.includes(trimmed)) return results;
      const newTags = [...newResults[resultIndex].tags, trimmed];
      newResults[resultIndex] = { ...newResults[resultIndex], tags: newTags };
      return newResults;
    });
  }

  discardBatchResult(index: number) {
    this.batchAnalysisResults.update(results => {
      const newResults = [...results];
      newResults.splice(index, 1);
      return newResults;
    });
    if (this.batchAnalysisResults().length === 0) {
      this.showBatchAnalysisModal.set(false);
    }
  }

  async saveBatchResults() {
    const results = this.batchAnalysisResults();
    if (results.length === 0) {
      this.showBatchAnalysisModal.set(false);
      return;
    }

    this.toastService.show(`${results.length} Analysen werden gespeichert...`, 'info');
    
    try {
      const updatePromises = results.map(async (data) => {
        const newTags = Array.from(new Set([...data.img.tags, ...data.tags]));
        try {
          await updateDoc(doc(db, 'images', data.img.id), {
            tags: newTags,
            description: data.description
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `images/${data.img.id}`);
        }
      });

      await Promise.all(updatePromises);
      this.toastService.show('Alle KI-Analysen erfolgreich gespeichert.', 'success');
      this.showBatchAnalysisModal.set(false);
      this.batchAnalysisResults.set([]);
    } catch (error) {
      console.error('Saving batch results failed:', error);
      this.toastService.show('Fehler beim Speichern der Batch-Ergebnisse.', 'error');
    }
  }
}
