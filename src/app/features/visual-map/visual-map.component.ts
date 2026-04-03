import { Component, ElementRef, OnInit, ViewChild, inject, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MapConfigurationResponse, SpotDefinition } from '../../core/api-v1';
import { NavbarComponent } from '../../layout/navbar.component';
import { catchError, concatMap, forkJoin, from, last, of, switchMap } from 'rxjs';
import Konva from 'konva';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import {
  BookingOption,
  BookingResponse,
  BundleListResponse,
  BundleOption,
  CartItemRequest,
  MapSummary,
  ProductListResponse,
  RentalItem,
  RentalMode,
  SaleItem,
  SpotAvailabilityStatus
} from './models/visual-map.model';

@Component({
  selector: 'app-visual-map',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, MatDatepickerModule, MatFormFieldModule],
  templateUrl: './visual-map.component.html',
  styleUrl: './visual-map.component.scss'
})
export class VisualMapComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('container') containerRef!: ElementRef;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);

  campsiteId!: number;
  campsite: any; // Using any for mock data structure
  loading = true;

  checkIn: Date | null = null;
  checkOut: Date | null = null;
  dateError = '';
  minDate = new Date();

  stage!: Konva.Stage;
  layer!: Konva.Layer;
  backgroundImage!: Konva.Image;

  zoomLevel = 1;
  minZoom = 0.5;
  maxZoom = 2.5;
  zoomStep = 0.15;
  
  mapConfig?: MapConfigurationResponse;
  selectedSpot?: SpotDefinition;
  
  availability: Record<string, SpotAvailabilityStatus> = {};
  showAuthModal = false;
  mapOptions: MapSummary[] = [];
  selectedMapCode: string | null = null;
  mapListLoading = false;
  mapListError = '';

  bookingOption: BookingOption = 'OWN';
  rentalMode: RentalMode = 'TENT';
  rentalItems: RentalItem[] = [];
  rentalAddOns: RentalItem[] = [];
  tentItems: RentalItem[] = [];
  saleItems: SaleItem[] = [];
  bundles: BundleOption[] = [];
  selectedAddOns = new Map<number, number>();
  selectedSaleItems = new Map<number, number>();
  selectedTentQuantity = 1;
  selectedTentId: number | null = null;
  selectedBundleId: number | null = null;
  bundlePickerOpen = false;
  bundleAvailability: Record<number, number> = {};
  bundleSelectionError = '';
  tentSelectionError = '';
  bookingError = '';
  bookingMessage = '';
  checkoutInfo?: BookingResponse;
  checkoutLoading = false;
  proofUploading = false;
  proofError = '';

  contactName = '';
  contactEmail = '';
  contactPhone = '';
  specialRequests = '';
  selectedBank = 'BCA';
  optionsLoading = false;
  optionsError = '';

  ngOnInit() {
    this.campsiteId = Number(this.route.snapshot.paramMap.get('campsiteId'));
    
    const qIn = this.route.snapshot.queryParamMap.get('checkIn');
    const qOut = this.route.snapshot.queryParamMap.get('checkOut');
    this.checkIn = this.parseDateValue(qIn);
    this.checkOut = this.parseDateValue(qOut);
    if (this.checkIn && this.checkOut && this.checkOut.getTime() < this.checkIn.getTime()) {
      this.dateError = 'Check-out must be after check-in.';
      this.checkOut = null;
    }

    this.loadCampsiteDetails();
  }

  ngAfterViewInit() {
    // Stage init happens after data load or if container is available
  }

  ngOnDestroy() {
    if (this.stage) {
      this.stage.destroy();
    }
  }

  private loadCampsiteDetails() {
    this.loading = true;
    this.http.get<any>(`/api/v1/public/campsites/${this.campsiteId}`).subscribe({
      next: (data) => {
        this.campsite = data;
        this.loading = false;
        // After content loads, the ViewChild 'container' will be available in the DOM (ngIf=campsite is true)
        // We need a slight delay or change detection cycle
        setTimeout(() => {
          this.initStage();
          this.loadMapOptions();
          this.loadBookingOptions();
        }, 100);
      },
      error: (err) => {
        console.error('Failed to load campsite details', err);
        this.loading = false;
      }
    });
  }

  private loadBookingOptions() {
    this.optionsLoading = true;
    this.optionsError = '';

    const rentalItems$ = this.http.get<ProductListResponse<RentalItem>>(`/api/v1/campsites/${this.campsiteId}/products`, {
      params: {
        type: 'RENTAL_ITEM',
        status: 'ACTIVE',
        page: '0',
        size: '200'
      }
    }).pipe(
      catchError((err) => {
        console.warn('Failed to load add-ons', err);
        this.optionsError = 'Failed to load rental items.';
        return of({ content: [] });
      })
    );

    const saleItems$ = this.http.get<ProductListResponse<SaleItem>>(`/api/v1/campsites/${this.campsiteId}/products`, {
      params: {
        type: 'SALE',
        status: 'ACTIVE',
        page: '0',
        size: '200'
      }
    }).pipe(
      catchError((err) => {
        console.warn('Failed to load sale items', err);
        this.optionsError = this.optionsError || 'Failed to load sale items.';
        return of({ content: [] });
      })
    );

    const bundles$ = this.http.get<BundleListResponse>(`/api/v1/bundles`, {
      params: {
        campsiteId: String(this.campsiteId),
        page: '0',
        size: '200'
      }
    }).pipe(
      catchError((err) => {
        console.warn('Failed to load bundles', err);
        this.optionsError = this.optionsError || 'Failed to load bundle options.';
        return of({ content: [] });
      })
    );

    forkJoin({ rentalItems: rentalItems$, saleItems: saleItems$, bundles: bundles$ }).subscribe({
      next: ({ rentalItems, saleItems, bundles }) => {
        this.rentalItems = (rentalItems?.content || []).filter((item) => item?.id);
        this.tentItems = this.rentalItems.filter((item) => this.isTentProduct(item));
        this.rentalAddOns = this.rentalItems.filter((item) => !this.isTentProduct(item));
        this.saleItems = (saleItems?.content || []).filter((item) => item?.id);
        this.bundles = (bundles?.content || []).filter((item) => item?.id);
        this.bundleSelectionError = '';
        this.updateBundleAvailability();
        this.ensureBundleSelection();
        this.optionsLoading = false;
      },
      error: () => {
        this.optionsLoading = false;
      }
    });
  }

  private initStage() {
    if (!this.containerRef) {
      console.warn('Container reference not found');
      return;
    }
    
    const container = this.containerRef.nativeElement;
    // Use fixed dimensions for the map content to ensure everything is visible via scrollbars
    const width = 800; 
    const height = 600;

    console.log(`Initializing Konva Stage: ${width}x${height}`);

    this.stage = new Konva.Stage({
      container: container,
      width: width,
      height: height,
      draggable: false // Disable stage dragging since we use scrollbars now
    });

    this.layer = new Konva.Layer();
    this.stage.add(this.layer);
    this.stage.on('wheel', (event) => this.handleZoomWheel(event));

    // Initial draw
    this.layer.draw();
  }

  private loadMapOptions() {
    this.mapListLoading = true;
    this.mapListError = '';
    this.http.get<MapSummary[]>(`/api/v1/public/maps/${this.campsiteId}/configs`).subscribe({
      next: (maps) => {
        this.mapOptions = (maps ?? []).filter((map) => map?.mapCode);
        this.mapListLoading = false;
        if (this.mapOptions.length > 0) {
          this.selectedMapCode = this.mapOptions[0].mapCode ?? null;
          this.loadMapConfig(this.selectedMapCode);
        } else {
          this.loadMockMap();
        }
      },
      error: (err) => {
        console.warn('Failed to load map list from server, loading mock data', err);
        this.mapListLoading = false;
        this.mapListError = 'Failed to load map layouts.';
        this.loadMockMap();
      }
    });
  }

  onMapSelectionChange() {
    this.selectedSpot = undefined;
    this.availability = {};
    this.loadMapConfig(this.selectedMapCode);
  }

  private loadMapConfig(mapCode: string | null) {
    if (!mapCode) {
      this.mapConfig = undefined;
      return;
    }
    console.log('Loading map data for campsite:', this.campsiteId, 'map:', mapCode);
    const configUrl = `/api/v1/public/maps/${this.campsiteId}/config`;
    this.http.get<MapConfigurationResponse>(configUrl, { params: { mapCode } }).subscribe({
      next: (config) => {
        this.mapConfig = config;
        if (this.mapConfig) {
          console.log('Map config loaded:', this.mapConfig);
          this.renderMap();
          this.loadAvailability();
        } else {
          this.loadMockMap();
        }
      },
      error: (err) => {
        console.warn('Failed to load map config from server, loading mock data', err);
        this.loadMockMap();
      }
    });
  }

  private loadAvailability() {
    const checkInParam = this.formatDateParam(this.checkIn);
    const checkOutParam = this.formatDateParam(this.checkOut);

    if (!checkInParam || !checkOutParam) {
      this.availability = {};
      return;
    }

    const availabilityUrl = `/api/v1/public/maps/${this.campsiteId}/availability`;
    const params: Record<string, string> = {
      checkIn: checkInParam,
      checkOut: checkOutParam
    };
    if (this.selectedMapCode) {
      params['mapCode'] = this.selectedMapCode;
    }
    this.http.get<Record<string, SpotAvailabilityStatus>>(availabilityUrl, { params }).subscribe({
      next: (data) => {
        this.availability = data ?? {};
        if (this.selectedSpot?.id) {
          const status = this.availability[this.selectedSpot.id] ?? 'AVAILABLE';
          if (status !== 'AVAILABLE') {
            this.selectedSpot = undefined;
          }
        }
        if (this.mapConfig) {
          this.renderMap();
        }
      },
      error: (err) => {
        console.warn('Failed to load map availability', err);
        this.availability = {};
      }
    });
  }

  private formatDateParam(value: Date | null): string | null {
    if (!value || Number.isNaN(value.getTime())) {
      return null;
    }
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private parseDateValue(value: string | null): Date | null {
    if (!value) {
      return null;
    }
    const trimmed = value.trim();
    if (trimmed.includes('T')) {
      const parsed = new Date(trimmed);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]) - 1;
      const day = Number(match[3]);
      return new Date(year, month, day);
    }
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return parsed;
  }

  isDateRangeReady(): boolean {
    if (!this.checkIn || !this.checkOut) {
      return false;
    }
    return this.checkOut.getTime() >= this.checkIn.getTime();
  }

  onDateRangeChange() {
    this.dateError = '';
    this.clearBookingNotice();
    if (!this.checkIn || !this.checkOut) {
      this.availability = {};
      return;
    }
    if (this.checkOut.getTime() < this.checkIn.getTime()) {
      this.dateError = 'Check-out must be after check-in.';
      return;
    }
    this.dateError = '';
    this.selectedSpot = undefined;
    this.availability = {};

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        checkIn: this.checkIn?.toISOString(),
        checkOut: this.checkOut?.toISOString()
      },
      queryParamsHandling: 'merge'
    });

    this.loadAvailability();
  }

  getStayDuration(): string {
    if (!this.checkIn || !this.checkOut) return '';

    const diffTime = Math.abs(this.checkOut.getTime() - this.checkIn.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return '';

    const nights = diffDays;
    const days = diffDays + 1;

    return `${days} Hari ${nights} Malam`;
  }

  private renderMap() {
    if (!this.mapConfig || !this.layer) return;

    this.layer.destroyChildren(); // Clear existing

    // Update stage size to match image dimensions from config
    const width = this.mapConfig.imageWidth || 800;
    const height = this.mapConfig.imageHeight || 600;
    this.applyZoom(this.zoomLevel, width, height);

    console.log(`Rendering map background: ${this.mapConfig.backgroundImageUrl} (${width}x${height})`);
    // A. Render Background Image
    if (this.mapConfig.backgroundImageUrl) {
      const imageObj = new Image();
      const backgroundUrl = this.resolveImageUrl(this.mapConfig.backgroundImageUrl);
      if (backgroundUrl) {
        if (backgroundUrl.startsWith('http')) {
          imageObj.crossOrigin = 'Anonymous';
        }
        imageObj.src = encodeURI(backgroundUrl);
      }
      imageObj.onload = () => {
        if (!this.layer) return;
        
        this.backgroundImage = new Konva.Image({
          x: 0,
          y: 0,
          image: imageObj,
          width: this.mapConfig!.imageWidth || 800,
          height: this.mapConfig!.imageHeight || 600,
        });
        this.layer.add(this.backgroundImage);
        this.backgroundImage.moveToBottom();
        this.layer.batchDraw();
        console.log('Background image rendered');
      };
    }

    // B. Render Spots
    console.log(`Rendering ${this.mapConfig.spots?.length || 0} spots`);
    this.mapConfig.spots?.forEach(spot => {
      this.renderSpot(spot);
    });
    this.layer.batchDraw();
  }

  private renderSpot(spot: SpotDefinition) {
    if (!spot.coordinates) return;

    const points: number[] = [];
    spot.coordinates.forEach(coord => {
      points.push(coord.x!, coord.y!);
    });

    const datesReady = this.isDateRangeReady();
    const status = datesReady ? (this.availability[spot.id!] ?? 'AVAILABLE') : 'LOCKED';
    const isUnavailable = status !== 'AVAILABLE';
    const fillColor = !datesReady ? '#9aa3a0' : (isUnavailable ? '#e74c3c' : '#4caf50');
    
    const polygon = new Konva.Line({
      points: points,
      fill: fillColor,
      stroke: 'black',
      strokeWidth: 1,
      closed: true,
      opacity: datesReady ? 0.6 : 0.35,
      listening: datesReady && !isUnavailable 
    });

    if (datesReady && !isUnavailable) {
      polygon.on('mouseenter', () => {
        this.stage.container().style.cursor = 'pointer';
        polygon.opacity(0.8);
        this.layer.batchDraw();
      });
      
      polygon.on('mouseleave', () => {
        this.stage.container().style.cursor = 'default';
        if (this.selectedSpot?.id !== spot.id) {
          polygon.opacity(0.6);
          polygon.fill('#4caf50');
        }
        this.layer.batchDraw();
      });

      polygon.on('click tap', () => {
        this.selectSpot(spot, polygon);
      });
    }

    this.layer.add(polygon);
  }

  private selectSpot(spot: SpotDefinition, shape: Konva.Line) {
    if (!this.isDateRangeReady()) {
      return;
    }
    this.layer.find('Line').forEach((node: any) => {
      if (node.attrs.fill === '#f1c40f') {
        node.fill('#4caf50');
        node.opacity(0.6);
      }
    });

    this.selectedSpot = spot;
    this.clearBookingNotice();
    shape.fill('#f1c40f');
    shape.opacity(0.8);
    this.layer.batchDraw();
  }

  private loadMockMap() {
    this.mapConfig = {
      id: 1,
      imageWidth: 800,
      imageHeight: 600,
      backgroundImageUrl: 'https://img.freepik.com/free-vector/camping-map-isometric-view_23-2148197771.jpg',
      spots: [
        {
          id: 'spot_1',
          name: 'Riverside A',
          coordinates: [{x: 100, y: 100}, {x: 200, y: 100}, {x: 200, y: 200}, {x: 100, y: 200}]
        },
        {
          id: 'spot_2',
          name: 'Forest View B',
          coordinates: [{x: 300, y: 100}, {x: 400, y: 100}, {x: 400, y: 200}, {x: 300, y: 200}]
        },
        {
          id: 'spot_3',
          name: 'Hilltop C',
          coordinates: [{x: 200, y: 300}, {x: 300, y: 300}, {x: 250, y: 400}]
        }
      ]
    };
    this.renderMap();
  }

  onBookingOptionChange() {
    this.bundlePickerOpen = false;
    this.bundleSelectionError = '';
    this.tentSelectionError = '';
    this.clearBookingNotice();
    if (this.bookingOption === 'RENTAL' && !this.rentalMode) {
      this.rentalMode = 'TENT';
    }
  }

  setRentalMode(mode: RentalMode) {
    this.rentalMode = mode;
    this.bundlePickerOpen = false;
    this.bundleSelectionError = '';
    this.tentSelectionError = '';
    this.clearBookingNotice();
  }

  toggleAddOn(product: RentalItem) {
    if (!product?.id) return;
    if (this.selectedAddOns.has(product.id)) {
      this.selectedAddOns.delete(product.id);
      return;
    }
    this.selectedAddOns.set(product.id, 1);
  }

  isAddOnSelected(product: RentalItem): boolean {
    if (!product?.id) return false;
    return this.selectedAddOns.has(product.id);
  }

  getAddOnQuantity(productId?: number): number {
    if (!productId) return 1;
    return this.selectedAddOns.get(productId) ?? 1;
  }

  setAddOnQuantity(productId: number, value: number) {
    if (!productId) return;
    const next = Number.isNaN(value) || value <= 0 ? 1 : Math.floor(value);
    if (this.selectedAddOns.has(productId)) {
      this.selectedAddOns.set(productId, next);
    }
  }

  selectTent(product: RentalItem) {
    if (!product?.id) return;
    this.selectedTentId = product.id;
    this.selectedTentQuantity = 1;
    this.tentSelectionError = '';
    this.clearBookingNotice();
  }

  isTentSelected(product: RentalItem): boolean {
    if (!product?.id) return false;
    return this.selectedTentId === product.id;
  }

  toggleSaleItem(product: SaleItem) {
    if (!product?.id) return;
    if (this.selectedSaleItems.has(product.id)) {
      this.selectedSaleItems.delete(product.id);
      return;
    }
    this.selectedSaleItems.set(product.id, 1);
  }

  isSaleItemSelected(product: SaleItem): boolean {
    if (!product?.id) return false;
    return this.selectedSaleItems.has(product.id);
  }

  getSaleQuantity(productId?: number): number {
    if (!productId) return 1;
    return this.selectedSaleItems.get(productId) ?? 1;
  }

  setSaleQuantity(productId: number, value: number) {
    if (!productId) return;
    const next = Number.isNaN(value) || value <= 0 ? 1 : Math.floor(value);
    if (this.selectedSaleItems.has(productId)) {
      this.selectedSaleItems.set(productId, next);
    }
  }

  toggleBundlePicker() {
    this.bundlePickerOpen = !this.bundlePickerOpen;
  }

  selectBundle(bundle: BundleOption) {
    if (!bundle?.id) return;
    if (this.getBundleAvailability(bundle) < 1) {
      this.bundleSelectionError = 'Bundle is out of stock.';
      this.bookingError = this.bundleSelectionError;
      return;
    }
    this.selectedBundleId = bundle.id;
    this.bundlePickerOpen = false;
    this.bundleSelectionError = '';
    this.clearBookingNotice();
  }

  get selectedBundle(): BundleOption | undefined {
    if (!this.selectedBundleId) return undefined;
    return this.bundles.find((bundle) => bundle.id === this.selectedBundleId);
  }

  describeBundle(bundle: BundleOption): string {
    const parts = (bundle.components || [])
      .map((component) => {
        const qty = component.quantity ?? 1;
        const name = component.productName || 'Item';
        return `${qty}x ${name}`;
      })
      .filter((part) => part);
    return parts.join(', ') || 'Bundle items included';
  }

  getBundleAvailability(bundle: BundleOption): number {
    if (!bundle?.id) return 0;
    return this.bundleAvailability[bundle.id] ?? 0;
  }

  trackByProductId(index: number, product: RentalItem): number {
    return product.id ?? index;
  }

  trackByTentId(index: number, product: RentalItem): number {
    return product.id ?? index;
  }

  trackBySaleItemId(index: number, product: SaleItem): number {
    return product.id ?? index;
  }

  trackByBundleId(index: number, bundle: BundleOption): number {
    return bundle.id ?? index;
  }

  getBundleImageStyle(bundle: BundleOption): string {
    const imageUrl = this.findBundleImage(bundle);
    if (!imageUrl) {
      return 'linear-gradient(135deg, rgba(230, 185, 132, 0.4), rgba(var(--primary-rgb), 0.3))';
    }
    return `url("${encodeURI(imageUrl)}")`;
  }

  private findBundleImage(bundle: BundleOption): string {
    for (const component of bundle.components || []) {
      const productId = component.productId;
      if (!productId) continue;
      const rentalItem = this.rentalItems.find((item) => item.id === productId);
      const saleItem = this.saleItems.find((item) => item.id === productId);
      const image = rentalItem?.images?.[0] || saleItem?.images?.[0];
      if (image) {
        return this.resolveImageUrl(image);
      }
    }
    return '';
  }

  private updateBundleAvailability() {
    const stockById = new Map<number, number>();
    for (const product of this.rentalItems) {
      if (!product?.id) continue;
      const stock = product.rentalDetails?.stockTotal;
      stockById.set(product.id, stock ?? 0);
    }
    for (const product of this.saleItems) {
      if (!product?.id) continue;
      const stock = product.saleDetails?.currentStock;
      stockById.set(product.id, stock ?? 0);
    }

    const availability: Record<number, number> = {};
    for (const bundle of this.bundles) {
      if (!bundle?.id) continue;
      availability[bundle.id] = this.calculateBundleAvailability(bundle, stockById);
    }

    this.bundleAvailability = availability;
  }

  private calculateBundleAvailability(bundle: BundleOption, stockById: Map<number, number>): number {
    if (!bundle.components || bundle.components.length === 0) {
      return 0;
    }
    let minAvailable = Number.POSITIVE_INFINITY;
    for (const component of bundle.components) {
      const productId = component.productId;
      if (!productId) return 0;
      const requiredQty = Math.max(1, component.quantity ?? 1);
      const stock = stockById.get(productId);
      if (stock === undefined) return 0;
      const available = Math.floor(stock / requiredQty);
      minAvailable = Math.min(minAvailable, available);
    }
    if (!Number.isFinite(minAvailable)) {
      return 0;
    }
    return Math.max(0, minAvailable);
  }

  private ensureBundleSelection() {
    if (!this.selectedBundleId) return;
    const availability = this.bundleAvailability[this.selectedBundleId] ?? 0;
    const exists = this.bundles.some((bundle) => bundle.id === this.selectedBundleId);
    if (!exists || availability < 1) {
      this.selectedBundleId = null;
      this.bundleSelectionError = 'Selected bundle is no longer available.';
    }
  }

  getBundleDetails(bundle: BundleOption | undefined) {
    if (!bundle?.components?.length) return [];
    return bundle.components.map((component) => {
      const productId = component.productId;
      const quantity = Math.max(1, component.quantity ?? 1);
      const rentalItem = this.rentalItems.find((item) => item.id === productId);
      const saleItem = this.saleItems.find((item) => item.id === productId);
      const name = rentalItem?.name || saleItem?.name || component.productName || 'Item';
      const description = rentalItem?.description || saleItem?.description || '';
      const image = rentalItem?.images?.[0] || saleItem?.images?.[0] || '';
      const price = rentalItem?.rentalDetails?.dailyRate ?? saleItem?.saleDetails?.unitPrice;
      const hasPrice = price !== undefined && price !== null;
      const priceLabel = hasPrice
        ? rentalItem
          ? `Rp ${Number(price).toLocaleString()} / night`
          : `Rp ${Number(price).toLocaleString()} / item`
        : '';
      return {
        id: productId ?? name,
        name,
        description,
        quantity,
        image,
        priceLabel
      };
    });
  }

  handleBooking() {
    this.bookingError = '';
    this.bookingMessage = '';
    this.proofError = '';
    if (!this.isDateRangeReady()) {
      this.dateError = 'Select stay dates before booking.';
      this.bookingError = this.dateError;
      return;
    }
    if (!this.selectedSpot) {
      this.bookingError = 'Select a spot before booking.';
      return;
    }
    if (!this.isCamperSession()) {
      this.showAuthModal = true;
      return;
    }

    const cartItems = this.buildCartItems();
    if (cartItems.length === 0) {
      this.bookingError = 'Selected booking items are not ready.';
      return;
    }

    this.checkoutLoading = true;
    from(cartItems)
      .pipe(
        concatMap((item) => this.http.post<BookingResponse>('/api/v1/bookings/cart/items', item)),
        last(),
        switchMap(() => this.http.get<BookingResponse>('/api/v1/bookings/cart'))
      )
      .subscribe({
        next: (booking) => {
          this.checkoutInfo = booking;
          this.bookingMessage = 'Booking draft created. Complete your booking details.';
          this.checkoutLoading = false;
          if (booking?.id) {
            this.router.navigate(['/bookings', booking.id]);
          }
        },
        error: (err) => {
          console.warn('Checkout failed', err);
          this.bookingError = err?.error?.message || 'Failed to create booking draft. Please try again.';
          this.checkoutLoading = false;
        }
      });
  }

  private buildCartItems(): CartItemRequest[] {
    const checkIn = this.formatDateParam(this.checkIn);
    const checkOut = this.formatDateParam(this.checkOut);
    if (!checkIn || !checkOut || !this.selectedSpot?.productId) {
      return [];
    }

    const items: CartItemRequest[] = [
      {
        productId: this.selectedSpot.productId,
        spotId: this.selectedSpot.id,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        quantity: 1
      }
    ];

    return items;
  }

  uploadPaymentProof(fileInput: HTMLInputElement) {
    if (!this.checkoutInfo?.id) {
      this.proofError = 'Checkout not found.';
      return;
    }
    if (!fileInput.files || fileInput.files.length === 0) {
      this.proofError = 'Select a file to upload.';
      return;
    }
    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);

    this.proofUploading = true;
    this.proofError = '';
    this.http.post<BookingResponse>(`/api/v1/bookings/${this.checkoutInfo.id}/payment-proof`, formData)
      .subscribe({
        next: (booking) => {
          this.checkoutInfo = booking;
          this.proofUploading = false;
          fileInput.value = '';
          this.bookingMessage = 'Payment proof uploaded. Waiting for verification.';
        },
        error: (err) => {
          console.warn('Proof upload failed', err);
          this.proofError = err?.error?.message || 'Failed to upload proof.';
          this.proofUploading = false;
        }
      });
  }

  closeAuthModal() {
    this.showAuthModal = false;
  }

  goToLogin() {
    this.showAuthModal = false;
    this.router.navigate(['/auth/login'], {
      queryParams: { returnUrl: this.router.url }
    });
  }

  goToRegister() {
    this.showAuthModal = false;
    this.router.navigate(['/auth/register'], {
      queryParams: { returnUrl: this.router.url }
    });
  }

  getImageStyle(image?: string): string {
    const url = this.resolveImageUrl(image);
    return url ? `url("${encodeURI(url)}")` : 'none';
  }

  private resolveImageUrl(image?: string): string {
    if (!image) {
      return '';
    }
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

  private hasSession(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    return !!(sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken'));
  }

  private isCamperSession(): boolean {
    if (!this.hasSession() || typeof window === 'undefined') {
      return false;
    }
    const raw = sessionStorage.getItem('userInfo') || localStorage.getItem('userInfo');
    if (!raw) {
      return false;
    }
    try {
      const parsed = JSON.parse(raw) as { role?: string };
      const role = (parsed.role || '').replace(/^ROLE_/, '').toUpperCase();
      return role === 'CAMPER';
    } catch {
      return false;
    }
  }

  private isTentProduct(product: RentalItem): boolean {
    if (product?.itemType === 'TENT') {
      return true;
    }
    if (product?.itemType) {
      return false;
    }
    const haystack = `${product?.name ?? ''} ${product?.description ?? ''}`.toLowerCase();
    return haystack.includes('tenda') || haystack.includes('tent');
  }

  private clearBookingNotice() {
    this.bookingError = '';
    this.bookingMessage = '';
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

    const width = baseWidth ?? this.mapConfig?.imageWidth ?? 800;
    const height = baseHeight ?? this.mapConfig?.imageHeight ?? 600;

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
    const container = this.containerRef?.nativeElement;
    if (!container || !prevZoom) {
      return;
    }
    const centerX = container.scrollLeft + container.clientWidth / 2;
    const centerY = container.scrollTop + container.clientHeight / 2;
    const mapCenterX = centerX / prevZoom;
    const mapCenterY = centerY / prevZoom;

    const nextScrollLeft = mapCenterX * this.zoomLevel - container.clientWidth / 2;
    const nextScrollTop = mapCenterY * this.zoomLevel - container.clientHeight / 2;
    container.scrollLeft = this.clampScroll(nextScrollLeft, container.scrollWidth - container.clientWidth);
    container.scrollTop = this.clampScroll(nextScrollTop, container.scrollHeight - container.clientHeight);
  }

  private clampScroll(value: number, max: number): number {
    if (!Number.isFinite(max) || max <= 0) {
      return 0;
    }
    return Math.max(0, Math.min(value, max));
  }
}
