import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import Konva from 'konva';
import {
  Coordinate,
  MapConfigurationRequest,
  MapConfigurationResponse,
  MapsService,
  ProductResponse,
  ProductsService,
  SpotDefinition
} from '../../../core/api-v1';
import {
  MapSummary,
  SpotShape,
  StagePoint,
  UploadBackgroundResponse
} from './models/merchant-map-editor.model';

@Component({
  selector: 'app-merchant-map-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './merchant-map-editor.component.html',
  styleUrl: './merchant-map-editor.component.scss'
})
export class MerchantMapEditorComponent implements OnInit, AfterViewInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private mapsService = inject(MapsService);
  private productsService = inject(ProductsService);
  private http = inject(HttpClient);

  @ViewChild('mapContainer') mapContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('mapWrapper') mapWrapper?: ElementRef<HTMLDivElement>;

  campsiteId = 0;
  mapConfigId?: number;

  mapOptions: MapSummary[] = [];
  selectedMapCode: string | null = null;
  mapName = '';
  isCreatingMap = false;
  mapListLoading = false;
  mapListError = '';
  usedProductIds = new Set<number>();

  backgroundImageUrl = '';
  imageWidth = 800;
  imageHeight = 600;
  backgroundFile: File | null = null;

  spots: SpotDefinition[] = [];
  selectedSpot: SpotDefinition | null = null;
  draftPoints: Coordinate[] = [];

  products: ProductResponse[] = [];
  productsLoading = false;
  productsError = '';

  isDrawMode = false;
  isLoading = false;
  loadError = '';
  saveError = '';
  saveMessage = '';
  isSaving = false;
  isUploading = false;

  zoomLevel = 1;
  minZoom = 0.5;
  maxZoom = 2.5;
  zoomStep = 0.15;

  private stage?: Konva.Stage;
  private layer?: Konva.Layer;
  private backgroundImage?: Konva.Image;
  private spotShapes = new Map<string, SpotShape>();
  private stageReady = false;
  private pendingRender = false;
  private isDraggingRect = false;
  private dragStart?: Coordinate;
  private dragMoved = false;
  private draftRect?: Konva.Rect;
  private skipNextClick = false;
  private requestedMapCode?: string;

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.campsiteId = idParam ? Number(idParam) : 0;
    this.loadMapList();
    this.loadProducts();
  }

  ngAfterViewInit() {
    this.initStage();
    this.stageReady = true;
    if (this.pendingRender) {
      this.renderMap();
      this.pendingRender = false;
    }
  }

  ngOnDestroy() {
    if (this.stage) {
      this.stage.destroy();
    }
  }

  toggleDrawMode() {
    this.isDrawMode = !this.isDrawMode;
    if (!this.isDrawMode) {
      this.clearDraft();
    }
    this.updateCursor();
  }

  undoDraftPoint() {
    this.draftPoints.pop();
    this.renderMap();
  }

  clearDraft() {
    this.draftPoints = [];
    this.renderMap();
  }

  finishSpot() {
    if (this.draftPoints.length < 3) {
      return;
    }

    const newSpot: SpotDefinition = {
      id: this.nextSpotId(),
      name: `Spot ${this.spots.length + 1}`,
      productId: undefined,
      coordinates: [...this.draftPoints],
      description: ''
    };

    this.spots = [...this.spots, newSpot];
    this.selectedSpot = newSpot;
    this.clearDraft();
  }

  selectSpot(spot: SpotDefinition) {
    this.selectedSpot = spot;
    this.updateSpotStyles();
  }

  deleteSpot(spot: SpotDefinition) {
    this.spots = this.spots.filter((item) => item !== spot);
    if (this.selectedSpot === spot) {
      this.selectedSpot = null;
    }
    this.renderMap();
  }

  updateSpotLabel(spot: SpotDefinition) {
    const spotId = spot.id ?? '';
    const shape = this.spotShapes.get(spotId);
    if (shape?.label) {
      shape.label.text(spot.name || spotId);
      this.layer?.batchDraw();
    }
  }

  onBackgroundSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.backgroundFile = file;
  }

  async uploadBackground() {
    if (!this.backgroundFile || !this.campsiteId) {
      return;
    }
    this.isUploading = true;
    this.saveError = '';
    this.saveMessage = '';

    try {
      const formData = new FormData();
      formData.append('image', this.backgroundFile);
      const response = await firstValueFrom(
        this.http.post<UploadBackgroundResponse>(
          `/api/v1/campsites/${this.campsiteId}/map/upload-background`,
          formData,
          { headers: this.authHeaders() }
        )
      );

      const dimensions = await this.readImageDimensions(this.backgroundFile);
      this.backgroundImageUrl = response.url ?? '';
      this.imageWidth = dimensions.width;
      this.imageHeight = dimensions.height;
      this.backgroundFile = null;
      this.scheduleRender();
      this.saveMessage = 'Background image uploaded.';
    } catch {
      this.saveError = 'Failed to upload background image.';
    } finally {
      this.isUploading = false;
    }
  }

  async saveMap() {
    this.saveError = '';
    this.saveMessage = '';
    if (!this.canSave) {
      this.saveError = 'Please resolve map issues before saving.';
      return;
    }

    const payload: MapConfigurationRequest = {
      mapCode: this.selectedMapCode ?? undefined,
      mapName: this.mapName.trim(),
      backgroundImageUrl: this.backgroundImageUrl,
      imageWidth: this.imageWidth,
      imageHeight: this.imageHeight,
      spots: this.spots
    };

    this.isSaving = true;
    try {
      const response = await firstValueFrom(this.mapsService.saveMapConfig(this.campsiteId, payload));
      if (response.id) {
        this.mapConfigId = response.id;
        await this.activateConfig(response.id);
        if (response.mapCode) {
          this.selectedMapCode = response.mapCode;
        }
        this.loadMapList(response.mapCode ?? undefined);
        this.isCreatingMap = false;
      }
      this.saveMessage = 'Map saved and published.';
    } catch {
      this.saveError = 'Failed to save map configuration.';
    } finally {
      this.isSaving = false;
    }
  }

  get canSave(): boolean {
    return this.validationErrors.length === 0;
  }

  get validationErrors(): string[] {
    const errors: string[] = [];
    if (!this.mapName.trim()) {
      errors.push('Map name is required.');
    }
    if (!this.backgroundImageUrl) {
      errors.push('Background image is required.');
    }
    if (!this.imageWidth || !this.imageHeight) {
      errors.push('Image size must be set.');
    }
    if (this.spots.length === 0) {
      errors.push('At least one spot is required.');
    }

    const productIds = new Set<number>();
    const duplicateProducts = new Set<number>();

    this.spots.forEach((spot, index) => {
      if (!spot.id || !spot.name) {
        errors.push(`Spot #${index + 1} needs an ID and name.`);
      }
      if (!spot.productId) {
        errors.push(`Spot ${spot.name || index + 1} must be linked to a product.`);
      } else if (this.usedProductIds.has(spot.productId)) {
        errors.push(`Spot ${spot.name || index + 1} uses a product already linked to another map.`);
      } else if (productIds.has(spot.productId)) {
        duplicateProducts.add(spot.productId);
      } else {
        productIds.add(spot.productId);
      }
      if (!spot.coordinates || spot.coordinates.length < 3) {
        errors.push(`Spot ${spot.name || index + 1} has invalid coordinates.`);
      }
    });

    if (duplicateProducts.size > 0) {
      errors.push('Each spot must use a unique product.');
    }

    return errors;
  }

  isProductUsed(productId?: number, currentSpot?: SpotDefinition | null): boolean {
    if (!productId) return false;
    if (this.usedProductIds.has(productId)) {
      return true;
    }
    return this.spots.some((spot) => spot.productId === productId && spot !== currentSpot);
  }

  private updateUsedProductIds() {
    const used = new Set<number>();
    this.mapOptions.forEach((map) => {
      if (!map?.productIds || !map.mapCode) {
        return;
      }
      if (this.selectedMapCode && map.mapCode === this.selectedMapCode) {
        return;
      }
      map.productIds.forEach((productId) => {
        if (productId) {
          used.add(productId);
        }
      });
    });
    this.usedProductIds = used;
  }

  private async activateConfig(configId: number) {
    await firstValueFrom(
      this.http.post(
        `/api/v1/maps/${this.campsiteId}/config/${configId}/activate`,
        {},
        { headers: this.authHeaders() }
      )
    );
  }

  private loadMapList(preferredMapCode?: string) {
    if (!this.campsiteId) {
      return;
    }

    this.mapListLoading = true;
    this.mapListError = '';

    this.http
      .get<MapSummary[]>(`/api/v1/campsites/${this.campsiteId}/map/configs`, { headers: this.authHeaders() })
      .subscribe({
        next: (configs) => {
          this.mapOptions = (configs ?? []).filter((map) => map?.mapCode);
          this.mapListLoading = false;
          this.updateUsedProductIds();
          const preferred =
            preferredMapCode && this.mapOptions.find((map) => map.mapCode === preferredMapCode)
              ? preferredMapCode
              : this.selectedMapCode;
          if (preferred && this.mapOptions.find((map) => map.mapCode === preferred)) {
            this.onMapSelected(preferred);
            return;
          }
          if (this.mapOptions.length > 0) {
            this.onMapSelected(this.mapOptions[0].mapCode ?? null);
            return;
          }
          this.startNewMap();
        },
        error: () => {
          this.mapOptions = [];
          this.mapListLoading = false;
          this.mapListError = 'Failed to load map layouts.';
          this.updateUsedProductIds();
          this.startNewMap();
        }
      });
  }

  onMapSelected(mapCode: string | null) {
    if (!mapCode) {
      this.startNewMap();
      return;
    }
    this.selectedMapCode = mapCode;
    const selected = this.mapOptions.find((map) => map.mapCode === mapCode);
    this.mapName = selected?.mapName ?? this.mapName;
    this.isCreatingMap = false;
    this.updateUsedProductIds();
    this.loadMapConfigByCode(mapCode);
  }

  startNewMap() {
    this.selectedMapCode = null;
    this.isCreatingMap = true;
    this.mapName = '';
    this.requestedMapCode = undefined;
    this.updateUsedProductIds();
    this.resetMapState();
  }

  private resetMapState() {
    this.mapConfigId = undefined;
    this.backgroundImageUrl = '';
    this.imageWidth = 800;
    this.imageHeight = 600;
    this.spots = [];
    this.selectedSpot = null;
    this.draftPoints = [];
    this.scheduleRender();
  }

  private loadMapConfigByCode(mapCode: string) {
    if (!this.campsiteId || !mapCode) {
      return;
    }

    this.isLoading = true;
    this.loadError = '';
    this.requestedMapCode = mapCode;
    this.http
      .get<MapConfigurationResponse>(`/api/v1/campsites/${this.campsiteId}/map`, {
        headers: this.authHeaders(),
        params: { mapCode }
      })
      .subscribe({
        next: (config: MapConfigurationResponse) => {
          if (this.requestedMapCode !== mapCode || this.selectedMapCode !== mapCode || this.isCreatingMap) {
            return;
          }
          this.mapConfigId = config.id;
          this.backgroundImageUrl = config.backgroundImageUrl ?? '';
          this.imageWidth = config.imageWidth ?? 800;
          this.imageHeight = config.imageHeight ?? 600;
          this.spots = config.spots ?? [];
          if (config.mapName) {
            this.mapName = config.mapName;
          }
          if (config.mapCode) {
            this.selectedMapCode = config.mapCode;
          }
          this.selectedSpot = null;
          this.scheduleRender();
          this.isLoading = false;
        },
        error: (err) => {
          if (this.requestedMapCode !== mapCode) {
            return;
          }
          if (err?.status !== 404) {
            this.loadError = 'Failed to load map configuration.';
          }
          this.resetMapState();
          this.isLoading = false;
        }
      });
  }

  private loadProducts() {
    if (!this.campsiteId) {
      return;
    }

    this.productsLoading = true;
    this.productsError = '';
    this.productsService.listProducts(this.campsiteId, 'RENTAL_SPOT', 'ACTIVE', 0, 200).subscribe({
      next: (response) => {
        this.products = response.content ?? [];
        this.productsLoading = false;
      },
      error: () => {
        this.productsError = 'Failed to load map rental products.';
        this.productsLoading = false;
      }
    });
  }

  private initStage() {
    if (!this.mapContainer) {
      return;
    }
    this.stage = new Konva.Stage({
      container: this.mapContainer.nativeElement,
      width: this.imageWidth,
      height: this.imageHeight,
      draggable: false
    });
    this.layer = new Konva.Layer();
    this.stage.add(this.layer);
    this.stage.on('click', (event) => this.handleStageClick(event));
    this.stage.on('mousedown touchstart', (event) => this.handleStagePointerDown(event));
    this.stage.on('mousemove touchmove', (event) => this.handleStagePointerMove(event));
    this.stage.on('mouseup touchend', (event) => this.handleStagePointerUp(event));
    this.stage.on('wheel', (event) => this.handleZoomWheel(event));
    this.updateCursor();
    this.applyZoom(this.zoomLevel);
  }

  private handleStageClick(event: Konva.KonvaEventObject<MouseEvent>) {
    if (this.skipNextClick) {
      this.skipNextClick = false;
      return;
    }
    if (this.isDrawMode) {
      const position = this.getPointerPosition();
      if (!position) {
        return;
      }
      this.draftPoints = [...this.draftPoints, { x: position.x, y: position.y }];
      this.renderMap();
      event.cancelBubble = true;
      return;
    }
    this.selectedSpot = null;
    this.updateSpotStyles();
  }

  private handleStagePointerDown(event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    if (!this.isDrawMode || !this.stage) {
      return;
    }

    const target = event.target;
    const className = typeof target?.getClassName === 'function' ? target.getClassName() : '';
    const isCanvasTarget =
      target === this.stage ||
      target === this.backgroundImage ||
      className === 'Image' ||
      className === 'Stage' ||
      className === 'Layer';

    if (!isCanvasTarget) {
      return;
    }

    const position = this.getPointerPosition();
    if (!position) {
      return;
    }

    this.isDraggingRect = true;
    this.dragMoved = false;
    this.dragStart = { x: position.x, y: position.y };
  }

  private handleStagePointerMove(_event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    if (!this.isDrawMode || !this.isDraggingRect || !this.stage || !this.layer || !this.dragStart) {
      return;
    }

    const position = this.getPointerPosition();
    if (!position) {
      return;
    }

    const width = position.x - (this.dragStart.x ?? 0);
    const height = position.y - (this.dragStart.y ?? 0);
    const rect = {
      x: Math.min(this.dragStart.x ?? 0, position.x),
      y: Math.min(this.dragStart.y ?? 0, position.y),
      width: Math.abs(width),
      height: Math.abs(height)
    };

    if (!this.draftRect) {
      this.draftRect = new Konva.Rect({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        stroke: '#d47e56',
        strokeWidth: 2,
        dash: [6, 4],
        fill: 'rgba(212, 126, 86, 0.12)',
        listening: false
      });
      this.layer.add(this.draftRect);
    } else {
      this.draftRect.setAttrs(rect);
    }

    if (rect.width > 4 || rect.height > 4) {
      this.dragMoved = true;
    }

    this.layer.batchDraw();
  }

  private handleStagePointerUp(_event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    if (!this.isDrawMode || !this.isDraggingRect || !this.stage) {
      return;
    }

    const position = this.getPointerPosition();
    const start = this.dragStart;
    this.isDraggingRect = false;
    this.dragStart = undefined;

    if (this.dragMoved && position && start) {
      const left = Math.min(start.x ?? 0, position.x);
      const right = Math.max(start.x ?? 0, position.x);
      const top = Math.min(start.y ?? 0, position.y);
      const bottom = Math.max(start.y ?? 0, position.y);

      if (right - left >= 4 && bottom - top >= 4) {
        this.draftPoints = [
          { x: left, y: top },
          { x: right, y: top },
          { x: right, y: bottom },
          { x: left, y: bottom }
        ];
      }

      this.skipNextClick = true;
      this.renderMap();
    }

    this.dragMoved = false;
    if (this.draftRect) {
      this.draftRect.destroy();
      this.draftRect = undefined;
      this.layer?.batchDraw();
    }
  }

  private renderMap() {
    if (!this.layer || !this.stage) {
      return;
    }
    const width = this.imageWidth || 800;
    const height = this.imageHeight || 600;
    this.applyZoom(this.zoomLevel, width, height);

    this.layer.destroyChildren();
    this.spotShapes.clear();

    if (this.backgroundImageUrl) {
      const imageObj = new Image();
      const backgroundUrl = this.resolveImageUrl(this.backgroundImageUrl);
      if (backgroundUrl.startsWith('http')) {
        imageObj.crossOrigin = 'Anonymous';
      }
      imageObj.src = encodeURI(backgroundUrl);
      imageObj.onload = () => {
        if (!this.layer) return;
        this.backgroundImage = new Konva.Image({
          x: 0,
          y: 0,
          image: imageObj,
          width,
          height
        });
        this.layer.add(this.backgroundImage);
        this.backgroundImage.moveToBottom();
        this.layer.batchDraw();
      };
    }

    this.spots.forEach((spot) => this.drawSpot(spot));
    if (this.draftPoints.length > 0) {
      this.drawDraft();
    }

    this.layer.draw();
  }

  private drawSpot(spot: SpotDefinition) {
    if (!spot.coordinates || spot.coordinates.length < 3 || !this.layer) {
      return;
    }

    const points = spot.coordinates.flatMap((coord) => [coord.x ?? 0, coord.y ?? 0]);
    const isSelected = this.selectedSpot?.id === spot.id;

    const polygon = new Konva.Line({
      points,
      closed: true,
      fill: isSelected ? 'rgba(86, 170, 118, 0.55)' : 'rgba(var(--primary-rgb), 0.35)',
      stroke: isSelected ? '#1f5d3f' : '#274a38',
      strokeWidth: isSelected ? 3 : 2
    });
    polygon.on('click', (event) => {
      event.cancelBubble = true;
      this.selectSpot(spot);
    });

    const center = this.getCentroid(spot.coordinates);
    const labelText = spot.name || spot.id || 'Spot';
    const label = new Konva.Text({
      x: center.x - labelText.length * 3,
      y: center.y - 6,
      text: labelText,
      fontSize: 12,
      fill: '#ffffff'
    });

    this.layer.add(polygon);
    this.layer.add(label);
    this.spotShapes.set(spot.id ?? labelText, { polygon, label });
  }

  private drawDraft() {
    if (!this.layer) return;
    const points = this.draftPoints.flatMap((coord) => [coord.x ?? 0, coord.y ?? 0]);
    const line = new Konva.Line({
      points,
      stroke: '#d47e56',
      strokeWidth: 2,
      lineCap: 'round',
      lineJoin: 'round',
      dash: [6, 4]
    });
    this.layer.add(line);
  }

  private updateSpotStyles() {
    this.spotShapes.forEach((shape, spotId) => {
      const isSelected = this.selectedSpot?.id === spotId;
      shape.polygon.fill(isSelected ? 'rgba(86, 170, 118, 0.55)' : 'rgba(var(--primary-rgb), 0.35)');
      shape.polygon.stroke(isSelected ? '#1f5d3f' : '#274a38');
      shape.polygon.strokeWidth(isSelected ? 3 : 2);
    });
    this.layer?.batchDraw();
  }

  private updateCursor() {
    if (this.stage) {
      this.stage.container().style.cursor = this.isDrawMode ? 'crosshair' : 'default';
    }
  }

  private scheduleRender() {
    if (this.stageReady) {
      this.renderMap();
    } else {
      this.pendingRender = true;
    }
  }

  private resolveImageUrl(image: string): string {
    if (image.startsWith('http://') || image.startsWith('https://')) {
      return image;
    }
    const normalized = image.replace(/^\/+/, '');
    if (normalized.startsWith('assets/')) {
      return `/${normalized}`;
    }
    if (normalized.startsWith('api/v1/')) {
      return `/${normalized}`;
    }
    return `/api/v1/${normalized}`;
  }

  private nextSpotId(): string {
    let index = this.spots.length + 1;
    let candidate = `spot_${index}`;
    while (this.spots.some((spot) => spot.id === candidate)) {
      index += 1;
      candidate = `spot_${index}`;
    }
    return candidate;
  }

  private getCentroid(coords: Coordinate[]): { x: number; y: number } {
    const total = coords.reduce(
      (acc: { x: number; y: number }, coord) => {
        return {
          x: acc.x + (coord.x ?? 0),
          y: acc.y + (coord.y ?? 0)
        };
      },
      { x: 0, y: 0 }
    );
    const divisor = coords.length || 1;
    return {
      x: total.x / divisor,
      y: total.y / divisor
    };
  }

  private authHeaders(): HttpHeaders {
    const token = this.getToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    return sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
  }

  private readImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.naturalWidth || 800, height: img.naturalHeight || 600 });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };
      img.src = url;
    });
  }

  zoomIn() {
    this.applyZoom(this.zoomLevel + this.zoomStep);
  }

  zoomOut() {
    this.applyZoom(this.zoomLevel - this.zoomStep);
  }

  resetZoom() {
    this.applyZoom(1);
  }

  private handleZoomWheel(event: Konva.KonvaEventObject<WheelEvent>) {
    if (!event.evt.ctrlKey && !event.evt.metaKey) {
      return;
    }
    event.evt.preventDefault();
    const delta = event.evt.deltaY > 0 ? -this.zoomStep : this.zoomStep;
    this.applyZoom(this.zoomLevel + delta);
  }

  private applyZoom(nextZoom: number, baseWidth?: number, baseHeight?: number) {
    const zoom = this.clampZoom(nextZoom);
    const prevZoom = this.zoomLevel || 1;
    this.zoomLevel = zoom;

    if (!this.stage) {
      return;
    }

    const width = baseWidth ?? this.imageWidth ?? 800;
    const height = baseHeight ?? this.imageHeight ?? 600;

    this.stage.scale({ x: zoom, y: zoom });
    this.stage.width(width * zoom);
    this.stage.height(height * zoom);
    this.layer?.batchDraw();

    this.adjustScroll(prevZoom);
  }

  private clampZoom(value: number): number {
    return Math.min(this.maxZoom, Math.max(this.minZoom, Number(value.toFixed(2))));
  }

  private adjustScroll(prevZoom: number) {
    const wrapper = this.mapWrapper?.nativeElement;
    if (!wrapper || !prevZoom) {
      return;
    }
    const centerX = wrapper.scrollLeft + wrapper.clientWidth / 2;
    const centerY = wrapper.scrollTop + wrapper.clientHeight / 2;
    const mapCenterX = centerX / prevZoom;
    const mapCenterY = centerY / prevZoom;

    const nextScrollLeft = mapCenterX * this.zoomLevel - wrapper.clientWidth / 2;
    const nextScrollTop = mapCenterY * this.zoomLevel - wrapper.clientHeight / 2;
    wrapper.scrollLeft = this.clampScroll(nextScrollLeft, wrapper.scrollWidth - wrapper.clientWidth);
    wrapper.scrollTop = this.clampScroll(nextScrollTop, wrapper.scrollHeight - wrapper.clientHeight);
  }

  private clampScroll(value: number, max: number): number {
    if (!Number.isFinite(max) || max <= 0) {
      return 0;
    }
    return Math.max(0, Math.min(value, max));
  }

  private getPointerPosition(): StagePoint | null {
    if (!this.stage) {
      return null;
    }
    const position = this.stage.getPointerPosition();
    if (!position) {
      return null;
    }
    const scale = this.zoomLevel || 1;
    return { x: position.x / scale, y: position.y / scale };
  }
}
