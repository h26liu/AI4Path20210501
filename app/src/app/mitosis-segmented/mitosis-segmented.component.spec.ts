import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MitosisSegmentedComponent } from './mitosis-segmented.component';

describe('MitosisSegmentedComponent', () => {
  let component: MitosisSegmentedComponent;
  let fixture: ComponentFixture<MitosisSegmentedComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MitosisSegmentedComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MitosisSegmentedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
