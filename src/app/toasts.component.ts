import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ToastService } from './toast.service';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-toasts',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      @for (toast of toastService.toasts(); track toast.id) {
        <div 
          class="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white max-w-sm transition-all"
          [ngClass]="{
            'bg-green-600': toast.type === 'success',
            'bg-red-600': toast.type === 'error',
            'bg-blue-600': toast.type === 'info'
          }"
        >
          <mat-icon>
            {{ toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : 'info' }}
          </mat-icon>
          <span class="text-sm font-medium whitespace-pre-wrap">{{ toast.message }}</span>
          <button (click)="toastService.remove(toast.id)" class="ml-auto text-white/80 hover:text-white">
            <mat-icon style="font-size: 18px; width: 18px; height: 18px;">close</mat-icon>
          </button>
        </div>
      }
    </div>
  `
})
export class ToastsComponent {
  toastService = inject(ToastService);
}
