import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PublicMarketComponent } from './public-market.component';
import { CampsitesService } from '../../core/api-v1';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';

describe('PublicMarketComponent', () => {
  let component: PublicMarketComponent;
  let fixture: ComponentFixture<PublicMarketComponent>;
  let campsitesServiceSpy: jasmine.SpyObj<CampsitesService>;

  beforeEach(async () => {
    // Keep the service provided but we won't spy on searchCampsites since we don't call it for now
    campsitesServiceSpy = jasmine.createSpyObj('CampsitesService', ['listCampsites']);

    await TestBed.configureTestingModule({
      imports: [PublicMarketComponent, HttpClientTestingModule, RouterTestingModule],
      providers: [
        { provide: CampsitesService, useValue: campsitesServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PublicMarketComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load mock campsites on init (temporary behavior)', (done) => {
    // Since we use setTimeout in ngOnInit, we need to wait
    setTimeout(() => {
        expect(component.campsites.length).toBe(3);
        expect(component.campsites[0].name).toContain('Pine Forest');
        done();
    }, 600);
  });
});