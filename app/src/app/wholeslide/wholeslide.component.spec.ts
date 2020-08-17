import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { WholeslideComponent } from './wholeslide.component';

describe('WholeslideComponent', () => {
  let component: WholeslideComponent;
  let fixture: ComponentFixture<WholeslideComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ WholeslideComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(WholeslideComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
