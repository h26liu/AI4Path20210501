import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { Ki67detectorComponent } from './ki67detector.component';

describe('Ki67detectorComponent', () => {
  let component: Ki67detectorComponent;
  let fixture: ComponentFixture<Ki67detectorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ Ki67detectorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(Ki67detectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
