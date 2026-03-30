import { Component, inject, computed, signal, effect, ViewChild, ElementRef, OnDestroy, AfterViewInit, ChangeDetectionStrategy, PLATFORM_ID, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivityService } from './activity.service';
import { Activity, ImageMetadata, KiTool, Prompt, TodoTask, StackOverflowTicket, AiSkill, Presentation } from './models';
import * as d3 from 'd3';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { db, auth, collection, query, where, collectionData } from './firebase';

interface UrlFrequency {
  url: string;
  domain: string;
  title: string;
  count: number;
  lastDate: Date;
  cluster: string;
  priority: string;
}

@Component({
  selector: 'app-analytics-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-full flex flex-col bg-gray-50 overflow-hidden">
      <!-- Header -->
      <div class="p-6 border-b border-gray-200 bg-white shrink-0 flex flex-col gap-4">
        <div class="flex justify-between items-center">
          <div>
            <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <mat-icon class="text-blue-600">dashboard</mat-icon>
              Dashboard
            </h1>
            <p class="text-sm text-gray-500 mt-1">Auswertung und Häufigkeit der Aktivitäten</p>
          </div>
          <div class="flex items-center gap-3">
            <button (click)="exportToExcel()" class="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium shadow-sm">
              <mat-icon class="text-sm">table_view</mat-icon> Excel Export
            </button>
            <button (click)="exportToPDF()" class="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium shadow-sm">
              <mat-icon class="text-sm">picture_as_pdf</mat-icon> PDF Export
            </button>
          </div>
        </div>

        <!-- Dashboard Switch -->
        <div class="flex bg-gray-100 p-1 rounded-xl self-start">
          <button 
            (click)="dashboardTab.set('activities')"
            [class.bg-white]="dashboardTab() === 'activities'"
            [class.shadow-sm]="dashboardTab() === 'activities'"
            [class.text-blue-600]="dashboardTab() === 'activities'"
            class="px-6 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
          >
            <mat-icon class="text-lg">list_alt</mat-icon> Aktivitäten
          </button>
          <button 
            (click)="dashboardTab.set('images')"
            [class.bg-white]="dashboardTab() === 'images'"
            [class.shadow-sm]="dashboardTab() === 'images'"
            [class.text-blue-600]="dashboardTab() === 'images'"
            class="px-6 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
          >
            <mat-icon class="text-lg">photo_library</mat-icon> Bilder
          </button>
          <button 
            (click)="dashboardTab.set('ki-tools')"
            [class.bg-white]="dashboardTab() === 'ki-tools'"
            [class.shadow-sm]="dashboardTab() === 'ki-tools'"
            [class.text-blue-600]="dashboardTab() === 'ki-tools'"
            class="px-6 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
          >
            <mat-icon class="text-lg">smart_toy</mat-icon> KI Tools
          </button>
          <button 
            (click)="dashboardTab.set('prompts')"
            [class.bg-white]="dashboardTab() === 'prompts'"
            [class.shadow-sm]="dashboardTab() === 'prompts'"
            [class.text-blue-600]="dashboardTab() === 'prompts'"
            class="px-6 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
          >
            <mat-icon class="text-lg">terminal</mat-icon> Prompts
          </button>
          <button 
            (click)="dashboardTab.set('tasks')"
            [class.bg-white]="dashboardTab() === 'tasks'"
            [class.shadow-sm]="dashboardTab() === 'tasks'"
            [class.text-blue-600]="dashboardTab() === 'tasks'"
            class="px-6 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
          >
            <mat-icon class="text-lg">task_alt</mat-icon> Aufgaben
          </button>
          <button 
            (click)="dashboardTab.set('stackoverflow')"
            [class.bg-white]="dashboardTab() === 'stackoverflow'"
            [class.shadow-sm]="dashboardTab() === 'stackoverflow'"
            [class.text-blue-600]="dashboardTab() === 'stackoverflow'"
            class="px-6 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
          >
            <mat-icon class="text-lg">forum</mat-icon> Stack Overflow
          </button>
          <button 
            (click)="dashboardTab.set('skills')"
            [class.bg-white]="dashboardTab() === 'skills'"
            [class.shadow-sm]="dashboardTab() === 'skills'"
            [class.text-blue-600]="dashboardTab() === 'skills'"
            class="px-6 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
          >
            <mat-icon class="text-lg">psychology</mat-icon> Skills
          </button>
          <button 
            (click)="dashboardTab.set('presentations')"
            [class.bg-white]="dashboardTab() === 'presentations'"
            [class.shadow-sm]="dashboardTab() === 'presentations'"
            [class.text-blue-600]="dashboardTab() === 'presentations'"
            class="px-6 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
          >
            <mat-icon class="text-lg">present_to_all</mat-icon> Präsentationen
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-6">
        <div class="max-w-7xl mx-auto space-y-6">
          
          @if (dashboardTab() === 'activities') {
            <!-- Filters -->
            <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap items-center gap-4">
              <div class="flex items-center gap-2">
                <mat-icon class="text-gray-400">date_range</mat-icon>
                <span class="text-sm font-medium text-gray-700">Zeitraum:</span>
              </div>
              <select [ngModel]="timeRange()" (ngModelChange)="timeRange.set($event)" class="border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 p-2 border">
                <option value="month">Dieser Monat</option>
                <option value="year">Dieses Jahr</option>
                <option value="all">Gesamter Zeitraum</option>
                <option value="custom">Benutzerdefiniert</option>
              </select>

              @if (timeRange() === 'custom') {
                <div class="flex items-center gap-2 ml-4">
                  <input type="date" [ngModel]="customStartDate()" (ngModelChange)="customStartDate.set($event)" class="border-gray-300 rounded-lg text-sm p-2 border">
                  <span class="text-gray-500">-</span>
                  <input type="date" [ngModel]="customEndDate()" (ngModelChange)="customEndDate.set($event)" class="border-gray-300 rounded-lg text-sm p-2 border">
                </div>
              }

              <div class="w-px h-6 bg-gray-300 mx-2 hidden md:block"></div>

              <div class="flex items-center gap-2">
                <mat-icon class="text-gray-400">category</mat-icon>
                <span class="text-sm font-medium text-gray-700">Cluster:</span>
              </div>
              <select [ngModel]="selectedCluster()" (ngModelChange)="selectedCluster.set($event)" class="border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 p-2 border min-w-[150px]">
                <option value="all">Alle Cluster</option>
                @for (cluster of availableClusters(); track cluster) {
                  <option [value]="cluster">{{ cluster }}</option>
                }
              </select>

              <div class="flex items-center gap-2 ml-2">
                <mat-icon class="text-gray-400">flag</mat-icon>
                <span class="text-sm font-medium text-gray-700">Priorität:</span>
              </div>
              <select [ngModel]="selectedPriority()" (ngModelChange)="selectedPriority.set($event)" class="border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 p-2 border min-w-[150px]">
                <option value="all">Alle Prioritäten</option>
                <option value="Hoch">Hoch</option>
                <option value="Mittel">Mittel</option>
                <option value="Niedrig">Niedrig</option>
              </select>
            </div>

            <!-- Summary Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
                <div class="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <mat-icon>assessment</mat-icon>
                </div>
                <div>
                  <p class="text-sm font-medium text-gray-500">Gesamtaktivitäten</p>
                  <p class="text-2xl font-bold text-gray-900">{{ totalActivities() }}</p>
                </div>
              </div>
              <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
                <div class="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                  <mat-icon>language</mat-icon>
                </div>
                <div>
                  <p class="text-sm font-medium text-gray-500">Einzigartige Domains</p>
                  <p class="text-2xl font-bold text-gray-900">{{ uniqueDomains() }}</p>
                </div>
              </div>
              <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
                <div class="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                  <mat-icon>category</mat-icon>
                </div>
                <div>
                  <p class="text-sm font-medium text-gray-500">Top Cluster</p>
                  <p class="text-xl font-bold text-gray-900 truncate max-w-[120px]" [title]="topCluster()">{{ topCluster() }}</p>
                </div>
              </div>
              <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
                <div class="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <mat-icon>flag</mat-icon>
                </div>
                <div>
                  <p class="text-sm font-medium text-gray-500">Häufigste Priorität</p>
                  <p class="text-xl font-bold text-gray-900">{{ topPriority() }}</p>
                </div>
              </div>
            </div>

            <!-- Charts Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
              <!-- Tooltip -->
              <div #tooltip class="absolute hidden bg-slate-900 text-white text-xs rounded py-1.5 px-2.5 pointer-events-none z-50 shadow-lg whitespace-nowrap transition-opacity duration-200 opacity-0"></div>

              <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                <h3 class="text-sm font-semibold text-gray-700 mb-4">Top Domains</h3>
                <div #chartTopDomains class="w-full h-[250px]"></div>
              </div>
              <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                <h3 class="text-sm font-semibold text-gray-700 mb-4">Aktivitäten über die Zeit</h3>
                <div #chartTimeline class="w-full h-[250px]"></div>
              </div>
              <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                <h3 class="text-sm font-semibold text-gray-700 mb-4">Cluster Verteilung</h3>
                <div #chartClusters class="w-full h-[250px]"></div>
              </div>
              <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                <h3 class="text-sm font-semibold text-gray-700 mb-4">Prioritäten Verteilung</h3>
                <div #chartPriorities class="w-full h-[250px]"></div>
              </div>
            </div>

            <!-- Table -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div class="p-5 border-b border-gray-200">
                <h3 class="text-lg font-semibold text-gray-900">URL Häufigkeiten</h3>
              </div>
              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                  <thead class="bg-gray-50">
                    <tr>
                      <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" (click)="setSort('count')">
                        <div class="flex items-center gap-1">Häufigkeit <mat-icon class="text-[16px] w-4 h-4">{{ getSortIcon('count') }}</mat-icon></div>
                      </th>
                      <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" (click)="setSort('title')">
                        <div class="flex items-center gap-1">Name <mat-icon class="text-[16px] w-4 h-4">{{ getSortIcon('title') }}</mat-icon></div>
                      </th>
                      <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" (click)="setSort('lastDate')">
                        <div class="flex items-center gap-1">Letztes Datum <mat-icon class="text-[16px] w-4 h-4">{{ getSortIcon('lastDate') }}</mat-icon></div>
                      </th>
                      <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" (click)="setSort('cluster')">
                        <div class="flex items-center gap-1">Cluster <mat-icon class="text-[16px] w-4 h-4">{{ getSortIcon('cluster') }}</mat-icon></div>
                      </th>
                      <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" (click)="setSort('priority')">
                        <div class="flex items-center gap-1">Priorität <mat-icon class="text-[16px] w-4 h-4">{{ getSortIcon('priority') }}</mat-icon></div>
                      </th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    @for (item of urlFrequencies(); track item.url) {
                      <tr class="hover:bg-gray-50 cursor-pointer" (dblclick)="openUrlDetails(item.url)">
                        <td class="px-6 py-4 whitespace-nowrap">
                          <span class="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-800 min-w-[2.5rem]">
                            {{ item.count }}
                          </span>
                        </td>
                        <td class="px-6 py-4">
                          <div class="text-sm font-medium text-gray-900 truncate max-w-xs" [title]="item.title">{{ item.title }}</div>
                          <div class="text-xs text-gray-500 truncate max-w-xs" [title]="item.url">{{ item.domain }}</div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {{ item.lastDate | date:'dd.MM.yyyy HH:mm' }}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {{ item.cluster }}
                          </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                          <span 
                            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                            [class.bg-red-100]="item.priority === 'Hoch'"
                            [class.text-red-800]="item.priority === 'Hoch'"
                            [class.bg-yellow-100]="item.priority === 'Mittel'"
                            [class.text-yellow-800]="item.priority === 'Mittel'"
                            [class.bg-green-100]="item.priority === 'Niedrig'"
                            [class.text-green-800]="item.priority === 'Niedrig'"
                          >
                            {{ item.priority }}
                          </span>
                        </td>
                      </tr>
                    }
                    @if (urlFrequencies().length === 0) {
                      <tr>
                        <td colspan="5" class="px-6 py-8 text-center text-gray-500">
                          Keine Daten für den ausgewählten Zeitraum gefunden.
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }

          @if (dashboardTab() === 'images') {
            <!-- Image Stats -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div class="flex items-center gap-4">
                  <div class="p-3 bg-blue-50 rounded-xl">
                    <mat-icon class="text-blue-600">photo_library</mat-icon>
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ressourcen Gesamt</p>
                    <h3 class="text-2xl font-bold text-gray-900">{{ images().length }}</h3>
                  </div>
                </div>
              </div>
              <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div class="flex items-center gap-4">
                  <div class="p-3 bg-emerald-50 rounded-xl">
                    <mat-icon class="text-emerald-600">label</mat-icon>
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tags Gesamt</p>
                    <h3 class="text-2xl font-bold text-gray-900">{{ totalImageTags() }}</h3>
                  </div>
                </div>
              </div>
              <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div class="flex items-center gap-4">
                  <div class="p-3 bg-amber-50 rounded-xl">
                    <mat-icon class="text-amber-600">priority_high</mat-icon>
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Hohe Priorität</p>
                    <h3 class="text-2xl font-bold text-gray-900">{{ highPriorityImages() }}</h3>
                  </div>
                </div>
              </div>
            </div>

            <!-- Image Charts -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div class="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <h3 class="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <mat-icon class="text-blue-600">bar_chart</mat-icon>
                  Ressourcen nach Cluster
                </h3>
                <div #imageClusterChart class="h-[400px] w-full flex items-center justify-center"></div>
              </div>
              <div class="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <h3 class="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <mat-icon class="text-emerald-600">donut_large</mat-icon>
                  Prioritätsverteilung
                </h3>
                <div #imagePriorityChart class="h-[400px] w-full flex items-center justify-center"></div>
              </div>
            </div>
          }

          @if (dashboardTab() === 'ki-tools') {
            <!-- KI Tool Stats -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div class="flex items-center gap-4">
                  <div class="p-3 bg-blue-50 rounded-xl">
                    <mat-icon class="text-blue-600">smart_toy</mat-icon>
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">KI Tools Gesamt</p>
                    <h3 class="text-2xl font-bold text-gray-900">{{ kiTools().length }}</h3>
                  </div>
                </div>
              </div>
              <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div class="flex items-center gap-4">
                  <div class="p-3 bg-emerald-50 rounded-xl">
                    <mat-icon class="text-emerald-600">check_circle</mat-icon>
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Im Einsatz (Ja)</p>
                    <h3 class="text-2xl font-bold text-gray-900">{{ activeKiTools() }}</h3>
                  </div>
                </div>
              </div>
              <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div class="flex items-center gap-4">
                  <div class="p-3 bg-amber-50 rounded-xl">
                    <mat-icon class="text-amber-600">verified</mat-icon>
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">EU AI Act Konform</p>
                    <h3 class="text-2xl font-bold text-gray-900">{{ compliantKiTools() }}</h3>
                  </div>
                </div>
              </div>
            </div>

            <!-- KI Tool Charts -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div class="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <h3 class="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <mat-icon class="text-blue-600">category</mat-icon>
                  Tools nach Kategorie
                </h3>
                <div #kiCategoryChart class="h-[400px] w-full flex items-center justify-center"></div>
              </div>
              <div class="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <h3 class="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <mat-icon class="text-emerald-600">security</mat-icon>
                  Zugangsstatus Verteilung
                </h3>
                <div #kiAccessChart class="h-[400px] w-full flex items-center justify-center"></div>
              </div>
            </div>
          }

          @if (dashboardTab() === 'prompts') {
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div class="flex items-center gap-4">
                  <div class="p-3 bg-amber-50 rounded-xl">
                    <mat-icon class="text-amber-600">terminal</mat-icon>
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Prompts Gesamt</p>
                    <h3 class="text-2xl font-bold text-gray-900">{{ prompts().length }}</h3>
                  </div>
                </div>
              </div>
              <div class="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 col-span-full">
                <h3 class="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <mat-icon class="text-amber-600">category</mat-icon>
                  Prompts nach Kategorie
                </h3>
                <div #promptCategoryChart class="h-[400px] w-full flex items-center justify-center"></div>
              </div>
            </div>
          }

          @if (dashboardTab() === 'tasks') {
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div class="flex items-center gap-4">
                  <div class="p-3 bg-blue-50 rounded-xl">
                    <mat-icon class="text-blue-600">task_alt</mat-icon>
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Aufgaben Gesamt</p>
                    <h3 class="text-2xl font-bold text-gray-900">{{ tasks().length }}</h3>
                  </div>
                </div>
              </div>
              <div class="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 col-span-full">
                <h3 class="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <mat-icon class="text-blue-600">donut_large</mat-icon>
                  Status Verteilung
                </h3>
                <div #taskStatusChart class="h-[400px] w-full flex items-center justify-center"></div>
              </div>
            </div>
          }

          @if (dashboardTab() === 'stackoverflow') {
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div class="flex items-center gap-4">
                  <div class="p-3 bg-red-50 rounded-xl">
                    <mat-icon class="text-red-600">forum</mat-icon>
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tickets Gesamt</p>
                    <h3 class="text-2xl font-bold text-gray-900">{{ stackoverflow().length }}</h3>
                  </div>
                </div>
              </div>
              <div class="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 col-span-full">
                <h3 class="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <mat-icon class="text-red-600">category</mat-icon>
                  Tickets nach Kategorie
                </h3>
                <div #soCategoryChart class="h-[400px] w-full flex items-center justify-center"></div>
              </div>
            </div>
          }

          @if (dashboardTab() === 'skills') {
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div class="flex items-center gap-4">
                  <div class="p-3 bg-purple-50 rounded-xl">
                    <mat-icon class="text-purple-600">psychology</mat-icon>
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Skills Gesamt</p>
                    <h3 class="text-2xl font-bold text-gray-900">{{ skills().length }}</h3>
                  </div>
                </div>
              </div>
              <div class="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 col-span-full">
                <h3 class="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <mat-icon class="text-purple-600">donut_large</mat-icon>
                  Skill-Typ Verteilung
                </h3>
                <div #skillTypeChart class="h-[400px] w-full flex items-center justify-center"></div>
              </div>
            </div>
          }

          @if (dashboardTab() === 'presentations') {
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div class="flex items-center gap-4">
                  <div class="p-3 bg-indigo-50 rounded-xl">
                    <mat-icon class="text-indigo-600">present_to_all</mat-icon>
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Präsentationen Gesamt</p>
                    <h3 class="text-2xl font-bold text-gray-900">{{ presentations().length }}</h3>
                  </div>
                </div>
              </div>
              <div class="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 col-span-full">
                <h3 class="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <mat-icon class="text-indigo-600">donut_large</mat-icon>
                  Dateityp Verteilung
                </h3>
                <div #presentationTypeChart class="h-[400px] w-full flex items-center justify-center"></div>
              </div>
            </div>
          }

        </div>
      </div>

      <!-- URL Details Modal -->
      @if (selectedUrlForDetails()) {
        <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div class="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div class="p-6 border-b border-gray-200 flex justify-between items-start shrink-0">
              <div>
                <h2 class="text-xl font-bold text-gray-900">Aktivitäten Details</h2>
                <p class="text-sm text-gray-500 mt-1 break-all">{{ selectedUrlForDetails() }}</p>
              </div>
              <button (click)="closeUrlDetails()" class="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <div class="p-6 overflow-y-auto flex-1">
              <div class="overflow-x-auto border border-gray-200 rounded-lg">
                <table class="min-w-full divide-y divide-gray-200">
                  <thead class="bg-gray-50">
                    <tr>
                      <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum & Zeit</th>
                      <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cluster</th>
                      <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priorität</th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    @for (activity of selectedUrlDetails(); track activity.id) {
                      <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {{ activity.date | date:'dd.MM.yyyy HH:mm:ss' }}
                        </td>
                        <td class="px-6 py-4 text-sm text-gray-500">
                          {{ activity.title }}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {{ activity.cluster || '-' }}
                          </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                          <span 
                            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                            [class.bg-red-100]="activity.priority === 'Hoch'"
                            [class.text-red-800]="activity.priority === 'Hoch'"
                            [class.bg-yellow-100]="activity.priority === 'Mittel'"
                            [class.text-yellow-800]="activity.priority === 'Mittel'"
                            [class.bg-green-100]="activity.priority === 'Niedrig'"
                            [class.text-green-800]="activity.priority === 'Niedrig'"
                          >
                            {{ activity.priority || '-' }}
                          </span>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
            <div class="p-6 border-t border-gray-200 shrink-0 flex justify-end">
              <button (click)="closeUrlDetails()" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm">
                Schließen
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class AnalyticsDashboardComponent implements AfterViewInit, OnDestroy, OnInit {
  activityService = inject(ActivityService);
  private auth = auth;
  private db = db;

  dashboardTab = signal<'activities' | 'images' | 'ki-tools' | 'prompts' | 'tasks' | 'stackoverflow' | 'skills' | 'presentations'>('activities');
  kiTools = signal<KiTool[]>([]);
  images = signal<ImageMetadata[]>([]);
  prompts = signal<Prompt[]>([]);
  tasks = signal<TodoTask[]>([]);
  stackoverflow = signal<StackOverflowTicket[]>([]);
  skills = signal<AiSkill[]>([]);
  presentations = signal<Presentation[]>([]);

  timeRange = signal<'month' | 'year' | 'all' | 'custom'>('month');
  customStartDate = signal<string>('');
  customEndDate = signal<string>('');

  selectedCluster = signal<string>('all');
  selectedPriority = signal<string>('all');

  sortColumn = signal<keyof UrlFrequency>('count');
  sortDirection = signal<'asc' | 'desc'>('desc');

  selectedUrlForDetails = signal<string | null>(null);

  selectedUrlDetails = computed(() => {
    const url = this.selectedUrlForDetails();
    if (!url) return [];
    return this.filteredActivities()
      .filter(a => a.url === url)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  });

  openUrlDetails(url: string) {
    this.selectedUrlForDetails.set(url);
  }

  closeUrlDetails() {
    this.selectedUrlForDetails.set(null);
  }

  @ViewChild('chartTopDomains') chartTopDomains!: ElementRef;
  @ViewChild('chartTimeline') chartTimeline!: ElementRef;
  @ViewChild('chartClusters') chartClusters!: ElementRef;
  @ViewChild('chartPriorities') chartPriorities!: ElementRef;
  @ViewChild('imageClusterChart') imageClusterRef!: ElementRef;
  @ViewChild('imagePriorityChart') imagePriorityRef!: ElementRef;
  @ViewChild('kiCategoryChart') kiCategoryRef!: ElementRef;
  @ViewChild('kiAccessChart') kiAccessRef!: ElementRef;
  @ViewChild('promptCategoryChart') promptCategoryRef!: ElementRef;
  @ViewChild('taskStatusChart') taskStatusRef!: ElementRef;
  @ViewChild('soCategoryChart') soCategoryRef!: ElementRef;
  @ViewChild('skillTypeChart') skillTypeRef!: ElementRef;
  @ViewChild('presentationTypeChart') presentationTypeRef!: ElementRef;
  @ViewChild('tooltip') tooltip!: ElementRef;

  private resizeObserver: ResizeObserver | null = null;
  private resizeTimeout: ReturnType<typeof setTimeout> | null = null;
  private platformId = inject(PLATFORM_ID);

  constructor() {
    effect(() => {
      const tab = this.dashboardTab();
      const activities = this.filteredActivities();
      const images = this.images();
      const kiTools = this.kiTools();

      if (isPlatformBrowser(this.platformId)) {
        setTimeout(() => {
          if (tab === 'activities') {
            this.drawCharts(activities);
          } else if (tab === 'images') {
            this.drawImageCharts(images);
          } else if (tab === 'ki-tools') {
            this.drawKiCharts(kiTools);
          } else if (tab === 'prompts') {
            this.drawBarChart(this.prompts(), 'category', this.promptCategoryRef.nativeElement, '#f59e0b');
          } else if (tab === 'tasks') {
            this.drawPieChart(this.tasks(), 'status', this.taskStatusRef.nativeElement);
          } else if (tab === 'stackoverflow') {
            this.drawBarChart(this.stackoverflow(), 'category', this.soCategoryRef.nativeElement, '#ef4444');
          } else if (tab === 'skills') {
            this.drawPieChart(this.skills(), 'type', this.skillTypeRef.nativeElement);
          } else if (tab === 'presentations') {
            this.drawPieChart(this.presentations(), 'type', this.presentationTypeRef.nativeElement);
          }
        }, 100);
      }
    });
  }

  ngOnInit() {
    const user = auth.currentUser;
    if (user) {
      // Images
      const imagesRef = collection(this.db, 'images');
      const qImgs = query(imagesRef, where('uid', '==', user.uid));
      collectionData<ImageMetadata>(qImgs, { idField: 'id' }).subscribe(data => {
        this.images.set(data);
      });

      // KI Tools
      const kiRef = collection(this.db, 'ki-tools');
      const qKi = query(kiRef, where('uid', '==', user.uid));
      collectionData<KiTool>(qKi, { idField: 'id' }).subscribe(data => {
        this.kiTools.set(data);
      });

      // Prompts
      const promptRef = collection(this.db, 'prompts');
      const qPrompts = query(promptRef, where('uid', '==', user.uid));
      collectionData<Prompt>(qPrompts, { idField: 'id' }).subscribe(data => {
        this.prompts.set(data);
      });

      // Tasks
      const taskRef = collection(this.db, 'todo-tasks');
      const qTasks = query(taskRef, where('uid', '==', user.uid));
      collectionData<TodoTask>(qTasks, { idField: 'id' }).subscribe(data => {
        this.tasks.set(data);
      });

      // StackOverflow
      const soRef = collection(this.db, 'stackoverflow-tickets');
      const qSo = query(soRef, where('uid', '==', user.uid));
      collectionData<StackOverflowTicket>(qSo, { idField: 'id' }).subscribe(data => {
        this.stackoverflow.set(data);
      });

      // Skills
      const skillRef = collection(this.db, 'ai-skills');
      const qSkills = query(skillRef, where('uid', '==', user.uid));
      collectionData<AiSkill>(qSkills, { idField: 'id' }).subscribe(data => {
        this.skills.set(data);
      });

      // Presentations
      const presRef = collection(this.db, 'presentations');
      const qPres = query(presRef, where('uid', '==', user.uid));
      collectionData<Presentation>(qPres, { idField: 'id' }).subscribe(data => {
        this.presentations.set(data);
      });
    }
  }

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    this.resizeObserver = new ResizeObserver(() => {
      if (this.resizeTimeout) {
        clearTimeout(this.resizeTimeout);
      }
      this.resizeTimeout = setTimeout(() => {
        this.drawCharts(this.filteredActivities());
      }, 150);
    });

    if (this.chartTopDomains) this.resizeObserver.observe(this.chartTopDomains.nativeElement);
    if (this.chartTimeline) this.resizeObserver.observe(this.chartTimeline.nativeElement);
    if (this.chartClusters) this.resizeObserver.observe(this.chartClusters.nativeElement);
    if (this.chartPriorities) this.resizeObserver.observe(this.chartPriorities.nativeElement);
  }

  ngOnDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
  }

  availableClusters = computed(() => {
    const activities = this.activityService.activities();
    const clusters = new Set(activities.map(a => a.cluster).filter(Boolean));
    return Array.from(clusters).sort();
  });

  filteredActivities = computed(() => {
    const activities = this.activityService.activities();
    const range = this.timeRange();
    const cluster = this.selectedCluster();
    const priority = this.selectedPriority();
    const now = new Date();
    
    return activities.filter(a => {
      // Time filter
      let timeMatch = true;
      const d = a.date;
      if (range === 'month') {
        timeMatch = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      } else if (range === 'year') {
        timeMatch = d.getFullYear() === now.getFullYear();
      } else if (range === 'custom') {
        if (!this.customStartDate() && !this.customEndDate()) {
          timeMatch = true;
        } else {
          const start = this.customStartDate() ? new Date(this.customStartDate()) : new Date(0);
          const end = this.customEndDate() ? new Date(this.customEndDate()) : new Date();
          end.setHours(23, 59, 59, 999);
          timeMatch = d >= start && d <= end;
        }
      }

      // Cluster filter
      const clusterMatch = cluster === 'all' || a.cluster === cluster;

      // Priority filter
      const priorityMatch = priority === 'all' || a.priority === priority;

      return timeMatch && clusterMatch && priorityMatch;
    });
  });

  totalActivities = computed(() => this.filteredActivities().length);
  uniqueDomains = computed(() => new Set(this.filteredActivities().map(a => a.domain)).size);
  topCluster = computed(() => {
    const acts = this.filteredActivities();
    if (acts.length === 0) return '-';
    const counts = d3.rollup(acts, v => v.length, d => d.cluster || 'Unbekannt');
    const sorted = Array.from(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0][0] || '-';
  });
  topPriority = computed(() => {
    const acts = this.filteredActivities();
    if (acts.length === 0) return '-';
    const counts = d3.rollup(acts, v => v.length, d => d.priority || 'Unbekannt');
    const sorted = Array.from(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0][0] || '-';
  });

  // Image Stats
  totalImageTags = computed(() => this.images().reduce((acc, img) => acc + (img.tags?.length || 0), 0));
  highPriorityImages = computed(() => this.images().filter(img => img.priority === 'Hoch').length);

  // KI Tool Stats
  activeKiTools = computed(() => this.kiTools().filter(t => t.access === 'ja').length);
  compliantKiTools = computed(() => this.kiTools().filter(t => t.euAiAct).length);

  urlFrequencies = computed(() => {
    const activities = this.filteredActivities();
    const map = new Map<string, UrlFrequency>();
    
    for (const a of activities) {
      if (!map.has(a.url)) {
        map.set(a.url, {
          url: a.url,
          domain: a.domain,
          title: a.title,
          count: 0,
          lastDate: a.date,
          cluster: a.cluster,
          priority: a.priority
        });
      }
      const entry = map.get(a.url)!;
      entry.count++;
      if (a.date > entry.lastDate) {
        entry.lastDate = a.date;
      }
    }
    
    const arr = Array.from(map.values());
    const col = this.sortColumn();
    const dir = this.sortDirection() === 'asc' ? 1 : -1;
    
    return arr.sort((a, b) => {
      if (a[col] < b[col]) return -1 * dir;
      if (a[col] > b[col]) return 1 * dir;
      return 0;
    });
  });

  setSort(column: keyof UrlFrequency) {
    if (this.sortColumn() === column) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('desc');
    }
  }

  getSortIcon(column: keyof UrlFrequency): string {
    if (this.sortColumn() !== column) return 'unfold_more';
    return this.sortDirection() === 'asc' ? 'expand_less' : 'expand_more';
  }

  drawCharts(activities: Activity[]) {
    if (!this.chartTopDomains || !this.chartTimeline || !this.chartClusters || !this.chartPriorities) return;
    
    this.drawTopDomains(activities);
    this.drawTimeline(activities);
    this.drawPieChart(activities, 'cluster', this.chartClusters.nativeElement);
    this.drawPieChart(activities, 'priority', this.chartPriorities.nativeElement);
  }

  drawImageCharts(images: ImageMetadata[]) {
    if (!this.imageClusterRef || !this.imagePriorityRef) return;
    this.drawBarChart(images, 'cluster', this.imageClusterRef.nativeElement, '#3b82f6');
    this.drawPieChart(images, 'priority', this.imagePriorityRef.nativeElement);
  }

  drawKiCharts(tools: KiTool[]) {
    if (!this.kiCategoryRef || !this.kiAccessRef) return;
    this.drawBarChart(tools, 'category', this.kiCategoryRef.nativeElement, '#10b981');
    this.drawPieChart(tools, 'access', this.kiAccessRef.nativeElement);
  }

  drawBarChart(data: (Activity | ImageMetadata | KiTool | Prompt | TodoTask | StackOverflowTicket | AiSkill | Presentation)[], key: string, container: HTMLElement, color: string) {
    d3.select(container).selectAll('*').remove();
    const counts = d3.rollups(data, v => v.length, (d: Activity | ImageMetadata | KiTool | Prompt | TodoTask | StackOverflowTicket | AiSkill | Presentation) => (d as unknown as Record<string, unknown>)[key] || 'Unkategorisiert')
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    if (counts.length === 0) return;

    const margin = { top: 20, right: 30, bottom: 60, left: 40 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3.select(container).append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand().range([0, width]).domain(counts.map(d => String(d.name))).padding(0.2);
    const y = d3.scaleLinear().domain([0, d3.max(counts, d => d.value) || 0]).range([height, 0]);

    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end');

    svg.append('g').call(d3.axisLeft(y).ticks(5));

    svg.selectAll('bar')
      .data(counts)
      .enter().append('rect')
      .attr('x', d => x(String(d.name))!)
      .attr('y', d => y(d.value))
      .attr('width', x.bandwidth())
      .attr('height', d => height - y(d.value))
      .attr('fill', color)
      .attr('rx', 4);
  }

  drawTopDomains(activities: Activity[]) {
    const container = this.chartTopDomains.nativeElement;
    d3.select(container).selectAll('*').remove();
    
    if (container.clientWidth <= 0) return;

    const counts = d3.rollup(activities, v => v.length, d => d.domain);
    const data = Array.from(counts, ([name, value]) => ({name, value}))
      .sort((a, b) => d3.descending(a.value, b.value))
      .slice(0, 10);

    if (data.length === 0) return;

    const margin = {top: 20, right: 20, bottom: 60, left: 40};
    const width = Math.max(0, container.clientWidth - margin.left - margin.right);
    const height = Math.max(0, 250 - margin.top - margin.bottom);

    if (width === 0 || height === 0) return;

    const svg = d3.select(container).append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
      .domain(data.map(d => d.name))
      .range([0, width])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value) || 0])
      .range([height, 0]);

    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('transform', 'translate(-10,0)rotate(-45)')
      .style('text-anchor', 'end')
      .style('font-size', '10px');

    svg.append('g').call(d3.axisLeft(y).ticks(5));

    svg.selectAll('.bar')
      .data(data)
      .enter().append('rect')
      .attr('class', 'bar')
      .attr('x', d => x(String(d.name))!)
      .attr('y', d => y(d.value))
      .attr('width', x.bandwidth())
      .attr('height', d => height - y(d.value))
      .attr('fill', '#3b82f6')
      .attr('rx', 4)
      .style('cursor', 'pointer')
      .style('transition', 'fill 0.2s')
      .on('mouseover', (event, d) => {
        d3.select(event.currentTarget).attr('fill', '#2563eb');
        const tooltipEl = this.tooltip.nativeElement;
        tooltipEl.style.display = 'block';
        tooltipEl.style.opacity = '1';
        tooltipEl.innerHTML = `<strong>${d.name}</strong><br/>Aufrufe: ${d.value}`;
      })
      .on('mousemove', (event) => {
        const tooltipEl = this.tooltip.nativeElement;
        tooltipEl.style.left = (event.pageX + 10) + 'px';
        tooltipEl.style.top = (event.pageY - 28) + 'px';
      })
      .on('mouseout', (event) => {
        d3.select(event.currentTarget).attr('fill', '#3b82f6');
        const tooltipEl = this.tooltip.nativeElement;
        tooltipEl.style.opacity = '0';
        setTimeout(() => { if (tooltipEl.style.opacity === '0') tooltipEl.style.display = 'none'; }, 200);
      });
  }

  drawTimeline(activities: Activity[]) {
    const container = this.chartTimeline.nativeElement;
    d3.select(container).selectAll('*').remove();

    if (container.clientWidth <= 0) return;

    const counts = d3.rollup(activities, v => v.length, d => {
      const date = new Date(d.date);
      return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    });
    
    const data = Array.from(counts, ([date, value]) => ({date: new Date(date), value}))
      .sort((a, b) => d3.ascending(a.date, b.date));

    if (data.length === 0) return;

    const margin = {top: 20, right: 20, bottom: 30, left: 40};
    const width = Math.max(0, container.clientWidth - margin.left - margin.right);
    const height = Math.max(0, 250 - margin.top - margin.bottom);

    if (width === 0 || height === 0) return;

    const svg = d3.select(container).append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime()
      .domain(d3.extent(data, d => d.date) as [Date, Date])
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value) || 0])
      .range([height, 0]);

    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(5));

    svg.append('g').call(d3.axisLeft(y).ticks(5));

    const line = d3.line<{date: Date, value: number}>()
      .x(d => x(d.date))
      .y(d => y(d.value))
      .curve(d3.curveMonotoneX);

    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#10b981')
      .attr('stroke-width', 2)
      .attr('d', line);
      
    svg.selectAll('.dot')
      .data(data)
      .enter().append('circle')
      .attr('class', 'dot')
      .attr('cx', d => x(d.date))
      .attr('cy', d => y(d.value))
      .attr('r', 5)
      .attr('fill', '#10b981')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .style('transition', 'r 0.2s')
      .on('mouseover', (event, d) => {
        d3.select(event.currentTarget).attr('r', 8);
        const tooltipEl = this.tooltip.nativeElement;
        tooltipEl.style.display = 'block';
        tooltipEl.style.opacity = '1';
        tooltipEl.innerHTML = `<strong>${d.date.toLocaleDateString()}</strong><br/>Aktivitäten: ${d.value}`;
      })
      .on('mousemove', (event) => {
        const tooltipEl = this.tooltip.nativeElement;
        tooltipEl.style.left = (event.pageX + 10) + 'px';
        tooltipEl.style.top = (event.pageY - 28) + 'px';
      })
      .on('mouseout', (event) => {
        d3.select(event.currentTarget).attr('r', 5);
        const tooltipEl = this.tooltip.nativeElement;
        tooltipEl.style.opacity = '0';
        setTimeout(() => { if (tooltipEl.style.opacity === '0') tooltipEl.style.display = 'none'; }, 200);
      });
  }

  drawPieChart(dataArr: (Activity | ImageMetadata | KiTool | Prompt | TodoTask | StackOverflowTicket | AiSkill | Presentation)[], key: string, container: HTMLElement) {
    d3.select(container).selectAll('*').remove();
    
    if (container.clientWidth <= 0) return;

    const counts = d3.rollup(dataArr, v => v.length, (d: Activity | ImageMetadata | KiTool | Prompt | TodoTask | StackOverflowTicket | AiSkill | Presentation) => String((d as unknown as Record<string, unknown>)[key] || 'Unbekannt'));
    const data = Array.from(counts, ([name, value]) => ({name, value}));

    if (data.length === 0) return;

    const width = Math.max(0, container.clientWidth);
    const height = 250;
    const radius = Math.max(0, Math.min(width, height) / 2 - 20);

    if (width === 0 || radius <= 0) return;

    const svg = d3.select(container).append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    const color = d3.scaleOrdinal(d3.schemeSet2);

    const pie = d3.pie<{name: string, value: number}>().value(d => d.value).sort(null);
    const arc = d3.arc<d3.PieArcDatum<{name: string, value: number}>>().innerRadius(radius * 0.5).outerRadius(radius);

    const arcs = svg.selectAll('.arc')
      .data(pie(data))
      .enter().append('g')
      .attr('class', 'arc');

    arcs.append('path')
      .attr('d', arc)
      .attr('fill', (d, i) => color(i.toString()) as string)
      .attr('stroke', 'white')
      .style('stroke-width', '2px')
      .style('cursor', 'pointer')
      .style('transition', 'opacity 0.2s')
      .on('mouseover', (event, d) => {
        d3.select(event.currentTarget).style('opacity', 0.8);
        const tooltipEl = this.tooltip.nativeElement;
        tooltipEl.style.display = 'block';
        tooltipEl.style.opacity = '1';
        tooltipEl.innerHTML = `<strong>${d.data.name}</strong><br/>Anzahl: ${d.data.value}`;
      })
      .on('mousemove', (event) => {
        const tooltipEl = this.tooltip.nativeElement;
        tooltipEl.style.left = (event.pageX + 10) + 'px';
        tooltipEl.style.top = (event.pageY - 28) + 'px';
      })
      .on('mouseout', (event) => {
        d3.select(event.currentTarget).style('opacity', 1);
        const tooltipEl = this.tooltip.nativeElement;
        tooltipEl.style.opacity = '0';
        setTimeout(() => { if (tooltipEl.style.opacity === '0') tooltipEl.style.display = 'none'; }, 200);
      });

    const arcLabel = d3.arc<d3.PieArcDatum<{name: string, value: number}>>().innerRadius(radius * 0.8).outerRadius(radius * 0.8);
    arcs.append('text')
      .attr('transform', d => `translate(${arcLabel.centroid(d)})`)
      .attr('dy', '0.35em')
      .style('text-anchor', 'middle')
      .style('font-size', '10px')
      .style('fill', '#333')
      .style('font-weight', 'bold')
      .text(d => d.data.name.length > 15 ? d.data.name.substring(0, 15) + '...' : d.data.name);
  }

  exportToExcel() {
    const data = this.urlFrequencies().map(f => ({
      'Häufigkeit': f.count,
      'Name': f.title,
      'Domain': f.domain,
      'URL': f.url,
      'Letzter Aufruf': new Date(f.lastDate).toLocaleString(),
      'Cluster': f.cluster,
      'Priorität': f.priority
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dashboard Export');
    XLSX.writeFile(wb, 'dashboard_export.xlsx');
  }

  exportToPDF() {
    const doc = new jsPDF();
    doc.text('Dashboard Export - Aktivitäten', 14, 15);
    
    const data = this.urlFrequencies().map(f => [
      f.count.toString(),
      f.title.length > 40 ? f.title.substring(0, 40) + '...' : f.title,
      f.domain,
      new Date(f.lastDate).toLocaleDateString(),
      f.cluster,
      f.priority
    ]);

    autoTable(doc, {
      head: [['Häufigkeit', 'Name', 'Domain', 'Letzter Aufruf', 'Cluster', 'Priorität']],
      body: data,
      startY: 20,
      styles: { fontSize: 8 }
    });

    doc.save('dashboard_export.pdf');
  }
}
