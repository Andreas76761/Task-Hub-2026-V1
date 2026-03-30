import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Document } from './models';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  documents = signal<Document[]>([]);
  private toastService = inject(ToastService);
  private platformId = inject(PLATFORM_ID);

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const stored = localStorage.getItem('documents_db_v2');
      if (stored) {
        const parsed = JSON.parse(stored);
        const docs = parsed.map((d: Document) => ({
          ...d,
          date: new Date(d.date)
        }));
        this.documents.set(docs);
      } else {
        this.documents.set([]);
      }
    } catch (e) {
      console.error('Failed to load documents from storage', e);
      this.documents.set([]);
    }
  }

  private saveToStorage(docs: Document[]) {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.setItem('documents_db_v2', JSON.stringify(docs));
    } catch (e) {
      console.error('Failed to save documents to storage', e);
    }
  }

  addDocument(doc: Document) {
    this.documents.update(docs => {
      const newDocs = [doc, ...docs];
      this.saveToStorage(newDocs);
      return newDocs;
    });
  }

  deleteDocument(id: string) {
    this.documents.update(docs => {
      const newDocs = docs.filter(d => d.id !== id);
      this.saveToStorage(newDocs);
      return newDocs;
    });
    this.toastService.show('Dokument wurde gelöscht.', 'success');
  }

  clearDocuments() {
    this.documents.set([]);
    this.saveToStorage([]);
  }
}
