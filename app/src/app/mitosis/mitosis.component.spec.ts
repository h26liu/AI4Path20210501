import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MitosisComponent } from './mitosis.component';

describe('MitosisComponent', () => {
  let component: MitosisComponent;
  let fixture: ComponentFixture<MitosisComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MitosisComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MitosisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
