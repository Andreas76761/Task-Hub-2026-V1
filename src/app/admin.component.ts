import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [MatIconModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-full flex flex-col bg-gray-50">
      <div class="p-6 border-b border-gray-200 bg-white shrink-0">
        <h1 class="text-2xl font-bold text-gray-900">Admin Bereich</h1>
        <p class="text-sm text-gray-500 mt-1">Systemeinstellungen und Benutzerverwaltung</p>
      </div>
      
      <div class="flex-1 overflow-y-auto p-6">
        <div class="max-w-4xl mx-auto space-y-8">
          
          <!-- System Settings -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <mat-icon>settings_suggest</mat-icon> Systemeinstellungen
              </h2>
            </div>
            <div class="p-6 space-y-6">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-sm font-medium text-gray-900">KI-Kategorisierung (Gemini)</h3>
                  <p class="text-sm text-gray-500">Automatische Kategorisierung von URLs aktivieren</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" [ngModel]="true" class="sr-only peer">
                  <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-sm font-medium text-gray-900">Erweiterte Logs</h3>
                  <p class="text-sm text-gray-500">Detaillierte Systemprotokolle speichern</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" [ngModel]="false" class="sr-only peer">
                  <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-sm font-medium text-gray-900">Automatische Backups</h3>
                  <p class="text-sm text-gray-500">Tägliche Sicherung der Datenbank</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" [ngModel]="true" class="sr-only peer">
                  <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          <!-- User Management -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <mat-icon>group</mat-icon> Benutzerverwaltung
              </h2>
              <button class="text-sm bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-md font-medium transition-colors">
                Benutzer einladen
              </button>
            </div>
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-white">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Benutzer</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rolle</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aktionen</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <div class="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs">A</div>
                      <div class="ml-3">
                        <div class="text-sm font-medium text-gray-900">Admin User</div>
                        <div class="text-sm text-gray-500">admin&#64;workspace.local</div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">Administrator</span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Aktiv</span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button class="text-gray-400 hover:text-gray-900"><mat-icon style="font-size: 20px; width: 20px; height: 20px;">more_vert</mat-icon></button>
                  </td>
                </tr>
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <div class="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-xs">M</div>
                      <div class="ml-3">
                        <div class="text-sm font-medium text-gray-900">Max Mustermann</div>
                        <div class="text-sm text-gray-500">max&#64;workspace.local</div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">Editor</span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Aktiv</span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button class="text-gray-400 hover:text-gray-900"><mat-icon style="font-size: 20px; width: 20px; height: 20px;">more_vert</mat-icon></button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  `
})
export class AdminComponent {}
