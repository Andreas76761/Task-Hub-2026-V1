import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-documentation',
  standalone: true,
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-8 h-full overflow-y-auto">
      <div class="max-w-4xl mx-auto">
        <header class="mb-8">
          <h2 class="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <mat-icon class="text-blue-600">description</mat-icon>
            {{ title() }}
          </h2>
          <p class="text-slate-500 mt-2">Dokumentation und Ressourcen für das Workspace Portal.</p>
        </header>

        <div 
          class="bg-white rounded-2xl shadow-sm border border-slate-200 pl-[1cm] pr-[1cm] pt-8 pb-[1cm]"
        >
          <div class="prose prose-slate max-w-none">
            @switch (type()) {
              @case ('usermanual') {
                <h3 class="text-2xl font-bold mb-6 border-b pb-2">Benutzerhandbuch - Workspace Portal</h3>
                
                <!-- Inhaltsverzeichnis -->
                <div class="bg-slate-50 p-6 rounded-xl mb-8 border border-slate-100">
                  <h4 class="text-lg font-semibold mb-3 flex items-center gap-2">
                    <mat-icon class="text-slate-400">list</mat-icon> Inhaltsverzeichnis
                  </h4>
                  <ul class="list-none pl-0 space-y-1 text-blue-600 font-medium">
                    <li><a href="#intro" class="hover:underline">1. Einleitung</a></li>
                    <li><a href="#dashboard" class="hover:underline">2. Das Dashboard</a></li>
                    <li><a href="#upload" class="hover:underline">3. Dokumente hochladen</a></li>
                    <li><a href="#archive" class="hover:underline">4. Dokumentenarchiv</a></li>
                    <li><a href="#ai" class="hover:underline">5. KI-Tools & Ressourcen</a></li>
                  </ul>
                </div>

                <!-- Kapitel 1 -->
                <section id="intro" class="mb-12">
                  <h4 class="text-xl font-bold mb-4">1. Einleitung</h4>
                  <p>Das Workspace Portal ist Ihre zentrale Anlaufstelle für die Verwaltung von Dokumenten, die Analyse von Daten und die Nutzung modernster KI-Technologien. Dieses Handbuch führt Sie durch alle Funktionen.</p>
                </section>

                <!-- Kapitel 2 -->
                <section id="dashboard" class="mb-12">
                  <h4 class="text-xl font-bold mb-4">2. Das Dashboard</h4>
                  <p>Nach der Anmeldung landen Sie auf dem Dashboard. Hier erhalten Sie einen schnellen Überblick über Ihre Aktivitäten und wichtige Kennzahlen.</p>
                  
                  <div class="my-6 border border-slate-200 rounded-xl overflow-hidden shadow-md bg-slate-50 p-4">
                    <div class="flex items-center justify-between mb-4 bg-white p-2 rounded border border-slate-100">
                      <span class="text-xs font-bold text-slate-400">SCREENSHOT: DASHBOARD ÜBERSICHT</span>
                      <mat-icon class="text-slate-300 text-sm">photo</mat-icon>
                    </div>
                    <div class="grid grid-cols-3 gap-4">
                      <div class="h-20 bg-blue-100 rounded-lg border border-blue-200 flex items-center justify-center text-blue-600 font-bold text-xs">STAT 1</div>
                      <div class="h-20 bg-emerald-100 rounded-lg border border-emerald-200 flex items-center justify-center text-emerald-600 font-bold text-xs">STAT 2</div>
                      <div class="h-20 bg-amber-100 rounded-lg border border-amber-200 flex items-center justify-center text-amber-600 font-bold text-xs">STAT 3</div>
                    </div>
                    <div class="mt-4 h-32 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-slate-300 italic text-sm">Aktivitäts-Graph (Visualisierung)</div>
                  </div>
                  
                  <p>Die Kacheln zeigen Ihnen die Anzahl der hochgeladenen Dokumente, aktive KI-Prozesse und die letzten Systembenachrichtigungen.</p>
                </section>

                <!-- Kapitel 3 -->
                <section id="upload" class="mb-12">
                  <h4 class="text-xl font-bold mb-4">3. Dokumente hochladen</h4>
                  <p>Über den Menüpunkt "Upload" können Sie neue Dateien in das System einpflegen. Wir unterstützen PDF, Word und Bildformate.</p>
                  
                  <div class="my-6 border-2 border-dashed border-blue-300 rounded-2xl p-12 bg-blue-50/30 flex flex-col items-center text-center">
                    <mat-icon class="text-blue-400 text-5xl mb-4">cloud_upload</mat-icon>
                    <p class="text-blue-600 font-semibold">Drag & Drop Bereich</p>
                    <p class="text-xs text-slate-400">Beispielansicht der Upload-Schnittstelle</p>
                  </div>

                  <p>Nach dem Upload werden die Dokumente automatisch indexiert und stehen für die KI-Analyse zur Verfügung.</p>
                </section>

                <!-- Kapitel 4 -->
                <section id="archive" class="mb-12">
                  <h4 class="text-xl font-bold mb-4">4. Dokumentenarchiv</h4>
                  <p>Im Archiv finden Sie alle Ihre Dateien. Nutzen Sie die Filterfunktion, um Dokumente nach Datum, Typ oder Schlagworten zu sortieren.</p>
                  
                  <div class="my-6 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <table class="min-w-full divide-y divide-slate-200">
                      <thead class="bg-slate-50">
                        <tr>
                          <th class="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">Name</th>
                          <th class="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">Datum</th>
                          <th class="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody class="bg-white divide-y divide-slate-100">
                        <tr>
                          <td class="px-4 py-2 text-xs">Rechnung_2026.pdf</td>
                          <td class="px-4 py-2 text-xs">28.03.2026</td>
                          <td class="px-4 py-2 text-xs text-emerald-600 font-bold">Verarbeitet</td>
                        </tr>
                        <tr>
                          <td class="px-4 py-2 text-xs">Vertrag_Entwurf.docx</td>
                          <td class="px-4 py-2 text-xs">25.03.2026</td>
                          <td class="px-4 py-2 text-xs text-blue-600 font-bold">In Analyse</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                <!-- Kapitel 5 -->
                <section id="ai" class="mb-12">
                  <h4 class="text-xl font-bold mb-4">5. KI-Tools & Ressourcen</h4>
                  <p>Nutzen Sie unsere integrierten KI-Modelle, um Zusammenfassungen zu erstellen, Texte zu übersetzen oder komplexe Fragen zu Ihren Dokumenten zu beantworten.</p>
                  
                  <div class="grid grid-cols-2 gap-4 my-6">
                    <div class="p-4 border border-blue-100 rounded-xl bg-gradient-to-br from-white to-blue-50 shadow-sm">
                      <mat-icon class="text-blue-500 mb-2">auto_awesome</mat-icon>
                      <h5 class="font-bold text-sm">KI-Chat</h5>
                      <p class="text-xs text-slate-500">Direkte Interaktion mit Ihren Daten.</p>
                    </div>
                    <div class="p-4 border border-purple-100 rounded-xl bg-gradient-to-br from-white to-purple-50 shadow-sm">
                      <mat-icon class="text-purple-500 mb-2">psychology</mat-icon>
                      <h5 class="font-bold text-sm">Analyse</h5>
                      <p class="text-xs text-slate-500">Mustererkennung und Insights.</p>
                    </div>
                  </div>
                </section>
              }
              @case ('releaseletter') {
                <h3 class="text-2xl font-bold mb-6 border-b pb-2">Releaseletter - Versionshistorie</h3>

                <!-- Inhaltsverzeichnis -->
                <div class="bg-slate-50 p-6 rounded-xl mb-8 border border-slate-100">
                  <h4 class="text-lg font-semibold mb-3 flex items-center gap-2">
                    <mat-icon class="text-slate-400">history</mat-icon> Versionsübersicht
                  </h4>
                  <ul class="list-none pl-0 space-y-1 text-blue-600 font-medium">
                    <li><a href="#v120" class="hover:underline">Version 1.2.0 - Dokumentations-Modul & KI-Update</a></li>
                    <li><a href="#v110" class="hover:underline">Version 1.1.0 - Archiv-Optimierung & Export</a></li>
                    <li><a href="#v100" class="hover:underline">Version 1.0.0 - Initialer Release & Kernfunktionen</a></li>
                  </ul>
                </div>

                <!-- Version 1.2.0 -->
                <section id="v120" class="mb-12">
                  <div class="flex items-center gap-3 mb-4">
                    <span class="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">v1.2.0</span>
                    <h4 class="text-xl font-bold m-0">März 2026: Dokumentations-Modul</h4>
                  </div>
                  <p>In diesem Release haben wir den Fokus auf die Benutzerführung und Hilfe-Ressourcen gelegt. Das neue Dokumentations-Modul bietet direkten Zugriff auf Handbücher und technische Details.</p>
                  
                  <div class="my-6 border border-slate-200 rounded-xl overflow-hidden shadow-md bg-white">
                    <div class="bg-slate-800 p-3 flex items-center gap-2">
                      <div class="w-3 h-3 rounded-full bg-red-500"></div>
                      <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div class="w-3 h-3 rounded-full bg-green-500"></div>
                      <span class="text-slate-400 text-[10px] ml-2">BROWSER: DOKUMENTATIONSMENÜ</span>
                    </div>
                    <div class="p-6 flex gap-6">
                      <div class="w-48 border-r border-slate-100 pr-4">
                        <div class="h-4 w-32 bg-slate-100 rounded mb-4"></div>
                        <div class="h-8 w-full bg-blue-50 border border-blue-100 rounded mb-2 flex items-center px-2">
                          <mat-icon class="text-blue-500 text-xs mr-2">menu_book</mat-icon>
                          <div class="h-2 w-20 bg-blue-200 rounded"></div>
                        </div>
                        <div class="h-8 w-full bg-slate-50 rounded mb-2 flex items-center px-2">
                          <mat-icon class="text-slate-300 text-xs mr-2">description</mat-icon>
                          <div class="h-2 w-20 bg-slate-200 rounded"></div>
                        </div>
                      </div>
                      <div class="flex-1">
                        <div class="h-6 w-48 bg-slate-200 rounded mb-4"></div>
                        <div class="space-y-2">
                          <div class="h-3 w-full bg-slate-100 rounded"></div>
                          <div class="h-3 w-full bg-slate-100 rounded"></div>
                          <div class="h-3 w-2/3 bg-slate-100 rounded"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <ul class="list-disc pl-5 space-y-2">
                    <li><strong>Neues Modul:</strong> Einführung des Dokumentationsbereichs in der Sidebar.</li>
                    <li><strong>KI-Update:</strong> Integration von Gemini 3.1 Pro für präzisere Dokumentenanalysen.</li>
                    <li><strong>UI-Polishing:</strong> Verbesserte Animationen beim Navigationswechsel.</li>
                  </ul>
                </section>

                <!-- Version 1.1.0 -->
                <section id="v110" class="mb-12">
                  <div class="flex items-center gap-3 mb-4">
                    <span class="bg-slate-600 text-white px-3 py-1 rounded-full text-sm font-bold">v1.1.0</span>
                    <h4 class="text-xl font-bold m-0">Februar 2026: Archiv-Optimierung</h4>
                  </div>
                  <p>Verbesserte Performance im Dokumentenarchiv und neue Filter-Möglichkeiten für große Datenmengen.</p>
                  
                  <div class="my-6 border border-slate-200 rounded-xl overflow-hidden shadow-md bg-white">
                    <div class="bg-slate-100 p-3 border-b border-slate-200 flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <div class="w-32 h-6 bg-white border border-slate-200 rounded px-2 flex items-center">
                          <mat-icon class="text-slate-300 text-[10px]">search</mat-icon>
                          <div class="ml-1 h-1 w-16 bg-slate-100 rounded"></div>
                        </div>
                        <div class="w-20 h-6 bg-white border border-slate-200 rounded flex items-center justify-center">
                          <div class="h-1 w-12 bg-slate-200 rounded"></div>
                        </div>
                      </div>
                      <div class="w-16 h-6 bg-blue-600 rounded flex items-center justify-center">
                        <div class="h-1 w-10 bg-blue-300 rounded"></div>
                      </div>
                    </div>
                    <div class="p-4">
                      <div class="space-y-2">
                        <div class="h-8 w-full bg-slate-50 rounded flex items-center px-4">
                          <div class="w-4 h-4 bg-slate-200 rounded mr-4"></div>
                          <div class="h-2 w-48 bg-slate-200 rounded"></div>
                        </div>
                        <div class="h-8 w-full bg-slate-50 rounded flex items-center px-4">
                          <div class="w-4 h-4 bg-slate-200 rounded mr-4"></div>
                          <div class="h-2 w-32 bg-slate-200 rounded"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <ul class="list-disc pl-5 space-y-2">
                    <li><strong>Schnellsuche:</strong> Echtzeit-Filterung in der Dokumentenliste.</li>
                    <li><strong>Export:</strong> CSV-Export für Analyseergebnisse hinzugefügt.</li>
                    <li><strong>Bugfixes:</strong> Behebung von Darstellungsproblemen auf mobilen Endgeräten.</li>
                  </ul>
                </section>

                <!-- Version 1.0.0 -->
                <section id="v100" class="mb-12">
                  <div class="flex items-center gap-3 mb-4">
                    <span class="bg-slate-400 text-white px-3 py-1 rounded-full text-sm font-bold">v1.0.0</span>
                    <h4 class="text-xl font-bold m-0">Januar 2026: Initialer Launch</h4>
                  </div>
                  <p>Der Grundstein für das Workspace Portal wurde gelegt. Fokus auf Stabilität und Kernfunktionen.</p>
                  
                  <div class="my-6 grid grid-cols-2 gap-4">
                    <div class="border border-slate-200 rounded-xl p-4 bg-slate-50">
                      <div class="w-full h-24 bg-white rounded border border-slate-100 flex flex-col items-center justify-center p-4">
                        <div class="w-12 h-12 bg-blue-100 rounded-full mb-2"></div>
                        <div class="h-2 w-20 bg-slate-200 rounded mb-1"></div>
                        <div class="h-1 w-12 bg-slate-100 rounded"></div>
                      </div>
                      <p class="text-[10px] text-center mt-2 text-slate-400 uppercase font-bold">User Profile v1</p>
                    </div>
                    <div class="border border-slate-200 rounded-xl p-4 bg-slate-50">
                      <div class="w-full h-24 bg-white rounded border border-slate-100 flex flex-col items-center justify-center p-4">
                        <mat-icon class="text-slate-200 text-3xl mb-1">dashboard</mat-icon>
                        <div class="h-2 w-24 bg-slate-200 rounded mb-1"></div>
                        <div class="h-1 w-16 bg-slate-100 rounded"></div>
                      </div>
                      <p class="text-[10px] text-center mt-2 text-slate-400 uppercase font-bold">Dashboard v1</p>
                    </div>
                  </div>

                  <ul class="list-disc pl-5 space-y-2">
                    <li><strong>Kernfunktionen:</strong> Login, Dashboard, Upload und Basis-Archiv.</li>
                    <li><strong>KI-Integration:</strong> Erste Anbindung an Large Language Models für Textverarbeitung.</li>
                    <li><strong>Sicherheit:</strong> Implementierung von Firebase Auth und Firestore Security Rules.</li>
                  </ul>
                </section>
              }
              @case ('systemdoku') {
                <h3 class="text-2xl font-bold mb-6 border-b pb-2">Systemdokumentation</h3>
                
                <div class="bg-slate-50 p-6 rounded-xl mb-8 border border-slate-100">
                  <h4 class="text-lg font-semibold mb-3 flex items-center gap-2">
                    <mat-icon class="text-slate-400">settings_ethernet</mat-icon> Inhaltsverzeichnis
                  </h4>
                  <ul class="list-none pl-0 space-y-1 text-blue-600 font-medium">
                    <li><a href="#tech-stack" class="hover:underline">1. Technologie-Stack</a></li>
                    <li><a href="#architecture" class="hover:underline">2. Systemarchitektur (Diagramm)</a></li>
                    <li><a href="#data-model" class="hover:underline">3. Datenmodell & Firestore</a></li>
                    <li><a href="#interfaces" class="hover:underline">4. Schnittstellen & Integrationen</a></li>
                    <li><a href="#security" class="hover:underline">5. Sicherheitskonzept</a></li>
                  </ul>
                </div>

                <section id="tech-stack" class="mb-12">
                  <h4 class="text-xl font-bold mb-4">1. Technologie-Stack</h4>
                  <p>Das Workspace Portal basiert auf einer modernen Cloud-Native Architektur.</p>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <div class="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div class="flex items-center gap-2 mb-2">
                        <mat-icon class="text-red-600">code</mat-icon>
                        <h5 class="font-bold text-slate-700 m-0">Frontend</h5>
                      </div>
                      <ul class="text-xs text-slate-500 space-y-1 pl-4">
                        <li>Angular 21 (Zoneless)</li>
                        <li>Tailwind CSS 4.0</li>
                        <li>Angular Material Components</li>
                        <li>Signals for State Management</li>
                      </ul>
                    </div>
                    <div class="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div class="flex items-center gap-2 mb-2">
                        <mat-icon class="text-orange-600">cloud</mat-icon>
                        <h5 class="font-bold text-slate-700 m-0">Backend (Firebase)</h5>
                      </div>
                      <ul class="text-xs text-slate-500 space-y-1 pl-4">
                        <li>Firestore NoSQL Database</li>
                        <li>Firebase Authentication</li>
                        <li>Cloud Storage for Documents</li>
                        <li>Cloud Functions (optional)</li>
                      </ul>
                    </div>
                  </div>
                </section>

                <section id="architecture" class="mb-12">
                  <h4 class="text-xl font-bold mb-4">2. Systemarchitektur</h4>
                  <p>Die folgende Darstellung visualisiert die Interaktion zwischen den verschiedenen Systemkomponenten und externen Diensten.</p>
                  
                  <div class="my-8 p-8 bg-slate-50 rounded-2xl border border-slate-200 overflow-x-auto">
                    <div class="min-w-[600px] flex flex-col items-center gap-8">
                      <!-- Client Layer -->
                      <div class="w-64 p-4 bg-white rounded-xl border-2 border-blue-500 shadow-lg text-center">
                        <div class="text-[10px] font-bold text-blue-600 uppercase mb-1">Client Layer</div>
                        <div class="font-bold text-slate-800">Angular Web App</div>
                        <div class="text-[10px] text-slate-400 mt-1">SPA / Zoneless / Signals</div>
                      </div>

                      <mat-icon class="text-slate-300">expand_more</mat-icon>

                      <!-- Integration Layer -->
                      <div class="flex gap-12">
                        <div class="flex flex-col items-center gap-2">
                          <div class="w-40 p-3 bg-white rounded-lg border border-slate-200 shadow-sm text-center">
                            <mat-icon class="text-orange-500 text-sm">lock</mat-icon>
                            <div class="text-[10px] font-bold">Firebase Auth</div>
                          </div>
                          <div class="h-4 w-px bg-slate-200"></div>
                        </div>
                        <div class="flex flex-col items-center gap-2">
                          <div class="w-40 p-3 bg-white rounded-lg border border-slate-200 shadow-sm text-center">
                            <mat-icon class="text-blue-500 text-sm">cloud_sync</mat-icon>
                            <div class="text-[10px] font-bold">Firebase SDK</div>
                          </div>
                          <div class="h-4 w-px bg-slate-200"></div>
                        </div>
                        <div class="flex flex-col items-center gap-2">
                          <div class="w-40 p-3 bg-white rounded-lg border border-slate-200 shadow-sm text-center">
                            <mat-icon class="text-purple-500 text-sm">auto_awesome</mat-icon>
                            <div class="text-[10px] font-bold">Gemini AI API</div>
                          </div>
                          <div class="h-4 w-px bg-slate-200"></div>
                        </div>
                      </div>

                      <!-- Data Layer -->
                      <div class="w-full grid grid-cols-3 gap-4">
                        <div class="p-4 bg-slate-800 rounded-xl text-white text-center">
                          <mat-icon class="text-orange-400 mb-1">storage</mat-icon>
                          <div class="text-[10px] font-bold uppercase text-slate-400">Database</div>
                          <div class="text-xs font-bold">Firestore</div>
                        </div>
                        <div class="p-4 bg-slate-800 rounded-xl text-white text-center">
                          <mat-icon class="text-blue-400 mb-1">folder_zip</mat-icon>
                          <div class="text-[10px] font-bold uppercase text-slate-400">Storage</div>
                          <div class="text-xs font-bold">Firebase Storage</div>
                        </div>
                        <div class="p-4 bg-slate-800 rounded-xl text-white text-center">
                          <mat-icon class="text-emerald-400 mb-1">dns</mat-icon>
                          <div class="text-[10px] font-bold uppercase text-slate-400">External</div>
                          <div class="text-xs font-bold">Google Drive API</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section id="data-model" class="mb-12">
                  <h4 class="text-xl font-bold mb-4">3. Datenmodell & Firestore</h4>
                  <p>Die Datenhaltung erfolgt in einer flachen Dokumentenstruktur in Firestore, um maximale Skalierbarkeit zu gewährleisten.</p>
                  
                  <div class="my-6 border border-slate-200 rounded-xl overflow-hidden shadow-md bg-slate-900 p-4 font-mono text-[10px] text-emerald-400">
                    <div class="flex items-center justify-between mb-2 border-b border-slate-700 pb-2">
                      <span>SCHEMA: documents/&#123;docId&#125;</span>
                      <mat-icon class="text-slate-500 text-xs">storage</mat-icon>
                    </div>
                    <pre class="m-0">
&#123;
  "id": "string",
  "name": "string",
  "type": "pdf | docx | png",
  "url": "string (storage_path)",
  "ownerId": "string (uid)",
  "status": "pending | processing | completed",
  "createdAt": "timestamp",
  "metadata": &#123;
    "size": "number",
    "tags": "string[]"
  &#125;
&#125;
                    </pre>
                  </div>
                </section>

                <section id="interfaces" class="mb-12">
                  <h4 class="text-xl font-bold mb-4">4. Schnittstellen & Integrationen</h4>
                  <p>Das System interagiert mit verschiedenen externen Schnittstellen:</p>
                  <ul class="list-disc pl-5 space-y-4">
                    <li>
                      <strong>Google Gemini API:</strong> 
                      Wird für die Inhaltsanalyse, OCR und die Generierung von Zusammenfassungen genutzt. Die Kommunikation erfolgt verschlüsselt über HTTPS.
                    </li>
                    <li>
                      <strong>Google Drive Picker:</strong> 
                      Ermöglicht den direkten Import von Dokumenten aus dem Google Drive des Nutzers.
                    </li>
                    <li>
                      <strong>Firebase SDK:</strong> 
                      Zentrale Schnittstelle für Echtzeit-Daten-Synchronisation und Authentifizierung.
                    </li>
                  </ul>
                </section>

                <section id="security" class="mb-12">
                  <h4 class="text-xl font-bold mb-4">5. Sicherheitskonzept</h4>
                  <p>Sicherheit wird durch eine Kombination aus Authentifizierung und granularen Security Rules gewährleistet.</p>
                  <ul class="list-disc pl-5 space-y-2">
                    <li><strong>Authentifizierung:</strong> Google OAuth 2.0 via Firebase Auth.</li>
                    <li><strong>Autorisierung:</strong> Firestore Security Rules verhindern unbefugten Zugriff auf Dokumente anderer Nutzer.</li>
                    <li><strong>Verschlüsselung:</strong> Alle Daten werden "at rest" und "in transit" (TLS) verschlüsselt.</li>
                  </ul>
                </section>
              }
            }
          </div>
        </div>
      </div>
    </div>
  `
})
export class DocumentationComponent {
  type = input.required<'usermanual' | 'releaseletter' | 'systemdoku'>();
  
  title() {
    switch (this.type()) {
      case 'usermanual': return 'Usermanual';
      case 'releaseletter': return 'Releaseletter';
      case 'systemdoku': return 'Systemdokumentation';
      default: return 'Dokumentation';
    }
  }
}
