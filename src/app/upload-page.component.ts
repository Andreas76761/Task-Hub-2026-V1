import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ActivityService } from './activity.service';
import { MatIconModule } from '@angular/material/icon';
import { FileUploadComponent } from './file-upload.component';

@Component({
  selector: 'app-upload-page',
  standalone: true,
  imports: [MatIconModule, FileUploadComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-full flex flex-col bg-gray-50">
      <div class="p-6 border-b border-gray-200 bg-white shrink-0">
        <h1 class="text-2xl font-bold text-gray-900">Dateien Hochladen</h1>
        <p class="text-sm text-gray-500 mt-1">Importiere neue Aktivitäten, Historien oder Dokumente in die Datenbank.</p>
      </div>
      
      <div class="flex-1 overflow-y-auto p-6">
        <div class="max-w-3xl mx-auto space-y-6">
          
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <mat-icon class="text-blue-600">cloud_upload</mat-icon>
              Aktivitäten Import
            </h2>
            <p class="text-gray-600 mb-6 text-sm">
              Lade hier deine Google Takeout Historie, CSV-Exporte oder JSON-Dateien hoch. 
              Das System erkennt automatisch neue Links, filtert Duplikate heraus und nutzt KI, 
              um die Einträge in sinnvolle Cluster und Kategorien einzuordnen.
            </p>
            
            <app-file-upload></app-file-upload>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div class="flex items-center gap-3 mb-2">
                <div class="p-2 bg-green-100 text-green-700 rounded-lg">
                  <mat-icon>auto_awesome</mat-icon>
                </div>
                <h3 class="font-semibold text-gray-900">KI-Clusterung</h3>
              </div>
              <p class="text-sm text-gray-600">
                Jeder neue Link wird analysiert und automatisch einem Cluster (z.B. Arbeit, Privat) 
                sowie einem spezifischen Subcluster zugeordnet.
              </p>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div class="flex items-center gap-3 mb-2">
                <div class="p-2 bg-purple-100 text-purple-700 rounded-lg">
                  <mat-icon>difference</mat-icon>
                </div>
                <h3 class="font-semibold text-gray-900">Duplikaterkennung</h3>
              </div>
              <p class="text-sm text-gray-600">
                Bereits vorhandene URLs werden beim Import übersprungen. Deine Datenbank 
                bleibt sauber und übersichtlich.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  `
})
export class UploadPageComponent {
  activityService = inject(ActivityService);
}
