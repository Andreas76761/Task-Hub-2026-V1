import { Injectable, signal, effect } from '@angular/core';
import { db, auth, collection, collectionData, doc, setDoc, deleteDoc, query, where } from './firebase';

export interface KiCategory {
  id: string;
  uid: string;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class KiCategoryService {
  private db = db;
  private auth = auth;

  categories = signal<KiCategory[]>([]);

  constructor() {
    effect(() => {
      const user = auth.currentUser;
      if (user) {
        const categoriesRef = collection(this.db, 'ki-categories');
        const q = query(categoriesRef, where('uid', '==', user.uid));
        collectionData<KiCategory>(q, { idField: 'id' }).subscribe(data => {
          this.categories.set(data);
        });
      } else {
        this.categories.set([]);
      }
    });
  }

  async addCategory(name: string) {
    const user = auth.currentUser;
    if (!user) return;

    const id = doc(collection(this.db, 'ki-categories')).id;
    const category: KiCategory = {
      id,
      uid: user.uid,
      name
    };

    await setDoc(doc(this.db, 'ki-categories', id), category);
  }

  async updateCategory(category: KiCategory) {
    await setDoc(doc(this.db, 'ki-categories', category.id), category);
  }

  async deleteCategory(id: string) {
    await deleteDoc(doc(this.db, 'ki-categories', id));
  }
}
