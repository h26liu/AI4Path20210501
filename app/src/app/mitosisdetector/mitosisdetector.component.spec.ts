import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MitosisdetectorComponent } from './mitosisdetector.component';

describe('MitosisdetectorComponent', () => {
  let component: MitosisdetectorComponent;
  let fixture: ComponentFixture<MitosisdetectorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MitosisdetectorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MitosisdetectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
