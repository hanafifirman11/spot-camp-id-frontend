import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  AmenityItem,
  CampsiteImage,
  MerchantCampsiteDetail,
  MerchantCampsiteRequest,
  MerchantCampsiteService
} from '../services/merchant-campsite.service';

interface AmenityGroup {
  category: string;
  items: AmenityItem[];
}

interface CampsiteFormValue {
  name: string | null;
  description: string | null;
  address: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  basePrice: number | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
}

@Component({
  selector: 'app-merchant-campsite-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './merchant-campsite-editor.component.html',
  styleUrl: './merchant-campsite-editor.component.scss'
})
export class MerchantCampsiteEditorComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private campsiteService = inject(MerchantCampsiteService);

  @ViewChild('coverInput') coverInput?: ElementRef<HTMLInputElement>;
  @ViewChild('galleryInput') galleryInput?: ElementRef<HTMLInputElement>;

  isEditMode = false;
  isLoading = false;
  isSaving = false;
  loadError = '';
  saveMessage = '';
  saveError = '';

  campsiteId?: number;
  detail: MerchantCampsiteDetail | null = null;

  form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    description: [''],
    address: ['', [Validators.required, Validators.maxLength(500)]],
    latitude: [null as number | null],
    longitude: [null as number | null],
    basePrice: [null as number | null, [Validators.required, Validators.min(0)]],
    checkInTime: ['14:00'],
    checkOutTime: ['12:00'],
    contactEmail: ['', Validators.email],
    contactPhone: ['']
  });

  amenities: AmenityItem[] = [];
  amenityGroups: AmenityGroup[] = [];
  selectedAmenityIds = new Set<number>();
  amenitiesMessage = '';
  amenitiesError = '';
  amenitiesSaving = false;

  rules: string[] = [];
  newRuleText = '';
  rulesMessage = '';
  rulesError = '';
  rulesSaving = false;

  images: CampsiteImage[] = [];
  coverFile: File | null = null;
  coverCaption = '';
  galleryFiles: File[] = [];
  imageMessage = '';
  imageError = '';
  imageUploading = false;

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const parsed = Number(idParam);
      if (!Number.isNaN(parsed)) {
        this.campsiteId = parsed;
        this.isEditMode = true;
      }
    }

    this.loadAmenities();
    if (this.isEditMode && this.campsiteId) {
      this.loadCampsite();
    }
  }

  loadCampsite() {
    if (!this.campsiteId) return;
    this.isLoading = true;
    this.loadError = '';
    this.campsiteService.getCampsite(this.campsiteId).subscribe({
      next: (detail) => {
        this.detail = detail;
        this.images = detail.images ?? [];
        this.rules = detail.rules ? [...detail.rules] : [];
        this.selectedAmenityIds = new Set((detail.amenities ?? []).map((amenity) => amenity.id));
        this.form.patchValue({
          name: detail.name ?? '',
          description: detail.description ?? '',
          address: detail.address ?? '',
          latitude: detail.latitude ?? null,
          longitude: detail.longitude ?? null,
          basePrice: detail.basePrice ?? null,
          checkInTime: this.formatTime(detail.checkInTime),
          checkOutTime: this.formatTime(detail.checkOutTime),
          contactEmail: detail.contactEmail ?? '',
          contactPhone: detail.contactPhone ?? ''
        });
        this.isLoading = false;
      },
      error: () => {
        this.loadError = 'Failed to load campsite details.';
        this.isLoading = false;
      }
    });
  }

  loadAmenities() {
    this.amenitiesError = '';
    this.campsiteService.listAmenities().subscribe({
      next: (response) => {
        this.amenities = response.amenities ?? [];
        this.amenityGroups = this.groupAmenities(this.amenities);
      },
      error: () => {
        this.amenitiesError = 'Failed to load amenities.';
      }
    });
  }

  saveCampsite() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.saveMessage = '';
    this.saveError = '';
    const payload = this.buildPayload();

    if (this.isEditMode && this.campsiteId) {
      this.campsiteService.updateCampsite(this.campsiteId, payload).subscribe({
        next: (response) => {
          this.detail = { ...(this.detail ?? {}), ...response };
          this.saveMessage = 'Campsite updated.';
          this.isSaving = false;
        },
        error: () => {
          this.saveError = 'Failed to update campsite. Please try again.';
          this.isSaving = false;
        }
      });
      return;
    }

    this.campsiteService.createCampsite(payload).subscribe({
      next: (response) => {
        this.isSaving = false;
        if (response.id) {
          this.router.navigate(['/merchant/campsites', response.id]);
          return;
        }
        this.router.navigate(['/merchant/campsites']);
      },
      error: () => {
        this.saveError = 'Failed to create campsite. Please try again.';
        this.isSaving = false;
      }
    });
  }

  toggleAmenity(amenity: AmenityItem) {
    if (this.selectedAmenityIds.has(amenity.id)) {
      this.selectedAmenityIds.delete(amenity.id);
    } else {
      this.selectedAmenityIds.add(amenity.id);
    }
  }

  saveAmenities() {
    if (!this.isEditMode || !this.campsiteId) return;
    this.amenitiesSaving = true;
    this.amenitiesMessage = '';
    this.amenitiesError = '';
    const amenityIds = Array.from(this.selectedAmenityIds);
    this.campsiteService.updateAmenities(this.campsiteId, amenityIds).subscribe({
      next: () => {
        this.amenitiesMessage = 'Amenities updated.';
        this.amenitiesSaving = false;
      },
      error: () => {
        this.amenitiesError = 'Failed to update amenities.';
        this.amenitiesSaving = false;
      }
    });
  }

  addRule() {
    const trimmed = this.newRuleText.trim();
    if (!trimmed) return;
    this.rules.push(trimmed);
    this.newRuleText = '';
  }

  removeRule(index: number) {
    this.rules.splice(index, 1);
  }

  moveRule(index: number, direction: number) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= this.rules.length) return;
    const [rule] = this.rules.splice(index, 1);
    this.rules.splice(nextIndex, 0, rule);
  }

  saveRules() {
    if (!this.isEditMode || !this.campsiteId) return;
    this.rulesSaving = true;
    this.rulesMessage = '';
    this.rulesError = '';
    const sanitizedRules = this.rules.map((rule) => rule.trim()).filter((rule) => rule.length > 0);
    this.rules = sanitizedRules;
    this.campsiteService.updateRules(this.campsiteId, sanitizedRules).subscribe({
      next: () => {
        this.rulesMessage = 'Rules updated.';
        this.rulesSaving = false;
      },
      error: () => {
        this.rulesError = 'Failed to update rules.';
        this.rulesSaving = false;
      }
    });
  }

  onCoverSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.coverFile = file ?? null;
  }

  onGallerySelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    this.galleryFiles = files;
  }

  async uploadCoverImage() {
    if (!this.isEditMode || !this.campsiteId || !this.coverFile) return;
    this.imageUploading = true;
    this.imageMessage = '';
    this.imageError = '';

    try {
      const image = await firstValueFrom(
        this.campsiteService.uploadImage(
          this.campsiteId,
          this.coverFile,
          this.coverCaption.trim() || undefined,
          true
        )
      );
      this.images = this.markPrimary(image);
      this.imageMessage = 'Cover image updated.';
      this.coverFile = null;
      this.coverCaption = '';
      if (this.coverInput?.nativeElement) {
        this.coverInput.nativeElement.value = '';
      }
    } catch {
      this.imageError = 'Failed to upload cover image.';
    } finally {
      this.imageUploading = false;
    }
  }

  async uploadGalleryImages() {
    if (!this.isEditMode || !this.campsiteId || this.galleryFiles.length === 0) return;
    this.imageUploading = true;
    this.imageMessage = '';
    this.imageError = '';

    try {
      const uploadedImages: CampsiteImage[] = [];
      for (const file of this.galleryFiles) {
        const image = await firstValueFrom(this.campsiteService.uploadImage(this.campsiteId, file));
        uploadedImages.push(image);
      }
      this.images = [...this.images, ...uploadedImages];
      this.imageMessage = `${uploadedImages.length} image(s) uploaded.`;
      this.galleryFiles = [];
      if (this.galleryInput?.nativeElement) {
        this.galleryInput.nativeElement.value = '';
      }
    } catch {
      this.imageError = 'Failed to upload gallery images.';
    } finally {
      this.imageUploading = false;
    }
  }

  setPrimaryImage(image: CampsiteImage) {
    if (!this.isEditMode || !this.campsiteId || !image.id) return;
    this.imageUploading = true;
    this.imageMessage = '';
    this.imageError = '';
    this.campsiteService.setPrimaryImage(this.campsiteId, image.id).subscribe({
      next: (response) => {
        this.images = this.markPrimary(response);
        this.imageMessage = 'Cover image updated.';
        this.imageUploading = false;
      },
      error: () => {
        this.imageError = 'Failed to set cover image.';
        this.imageUploading = false;
      }
    });
  }

  get primaryImage(): CampsiteImage | null {
    return this.images.find((img) => img.isPrimary) ?? null;
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.form.get(fieldName);
    return !!(control && control.invalid && (control.touched || control.dirty));
  }

  resolveImageUrl(imageUrl?: string | null): string {
    if (!imageUrl) return '';
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    const normalized = imageUrl.replace(/^\/+/, '');
    if (normalized.startsWith('assets/')) {
      return `/${normalized}`;
    }
    if (normalized.startsWith('api/v1/')) {
      return `/${normalized}`;
    }
    return `/api/v1/${normalized}`;
  }

  getImageStyle(imageUrl?: string | null): string {
    const url = this.resolveImageUrl(imageUrl);
    return url ? `url("${encodeURI(url)}")` : 'none';
  }

  private markPrimary(image: CampsiteImage): CampsiteImage[] {
    const updated = [...this.images];
    const index = updated.findIndex((item) => item.id === image.id);
    if (index >= 0) {
      updated[index] = image;
    } else {
      updated.push(image);
    }
    return updated.map((item) => ({
      ...item,
      isPrimary: item.id === image.id
    }));
  }

  private formatTime(value?: string | null): string {
    if (!value) return '';
    return value.length >= 5 ? value.slice(0, 5) : value;
  }

  private buildPayload(): MerchantCampsiteRequest {
    const raw = this.form.getRawValue() as CampsiteFormValue;
    const latitudeValue = raw.latitude;
    const longitudeValue = raw.longitude;
    const latitude = latitudeValue === null || latitudeValue === undefined || latitudeValue === ''
      ? null
      : Number(latitudeValue);
    const longitude = longitudeValue === null || longitudeValue === undefined || longitudeValue === ''
      ? null
      : Number(longitudeValue);
    const basePrice = Number(raw.basePrice);

    return {
      name: raw.name?.trim() ?? '',
      description: raw.description?.trim() || undefined,
      address: raw.address?.trim() ?? '',
      latitude: Number.isNaN(latitude) ? null : latitude,
      longitude: Number.isNaN(longitude) ? null : longitude,
      basePrice: Number.isNaN(basePrice) ? 0 : basePrice,
      checkInTime: raw.checkInTime || null,
      checkOutTime: raw.checkOutTime || null,
      contactEmail: raw.contactEmail?.trim() || null,
      contactPhone: raw.contactPhone?.trim() || null
    };
  }

  private groupAmenities(amenities: AmenityItem[]): AmenityGroup[] {
    const grouped = new Map<string, AmenityItem[]>();
    amenities.forEach((amenity) => {
      const category = amenity.category || 'General';
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(amenity);
    });
    return Array.from(grouped.entries())
      .map(([category, items]) => ({ category, items }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }
}
