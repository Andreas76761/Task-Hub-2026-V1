import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ActivityService } from './activity.service';
import { DashboardComponent } from './dashboard.component';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-activities',
  standalone: true,
  imports: [DashboardComponent, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-full w-full">
      @if (activityService.activities().length === 0) {
        <div class="h-full flex items-center justify-center p-6 bg-gray-50">
          <div class="text-center max-w-md">
            <div class="bg-blue-100 text-blue-600 p-4 rounded-full inline-flex mb-4">
              <mat-icon style="transform: scale(1.5); width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">monitor_heart</mat-icon>
            </div>
            <h2 class="text-2xl font-bold text-gray-900 mb-2">Keine Aktivitäten vorhanden</h2>
            <p class="text-gray-500 mb-6">
              Deine Datenbank ist leer. Bitte wechsle in den Bereich "Dateien Hochladen", um deinen Verlauf zu importieren.
              <br><br>
              <span class="text-sm">Eine Quelle ist der Suchverlauf bei <code>chrome://history/</code> und <code>edge://history/all</code></span>
            </p>
          </div>
        </div>
      } @else {
        <app-dashboard></app-dashboard>
      }
    </div>
  `
})
export class ActivitiesComponent {
  activityService = inject(ActivityService);
}
