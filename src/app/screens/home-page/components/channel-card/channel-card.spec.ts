import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChannelCard } from './channel-card';

describe('ChannelCard', () => {
  let component: ChannelCard;
  let fixture: ComponentFixture<ChannelCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChannelCard],
    }).compileComponents();

    fixture = TestBed.createComponent(ChannelCard);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('channel', {
      id: 1,
      name: 'Test channel',
      description: 'Test description',
      coverUrl: 'https://example.com/cover.jpg',
      category: 'Gaming',
      viewers: '42',
    });
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
