import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SmallimgComponent } from './smallimg.component';

describe('SmallimgComponent', () => {
  let component: SmallimgComponent;
  let fixture: ComponentFixture<SmallimgComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SmallimgComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SmallimgComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
