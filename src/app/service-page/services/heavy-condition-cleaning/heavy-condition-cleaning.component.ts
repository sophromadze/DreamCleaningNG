import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-heavy-condition-cleaning',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './heavy-condition-cleaning.component.html',
  styleUrl: './heavy-condition-cleaning.component.scss'
})
export class HeavyConditionCleaningComponent {
  constructor() {}
} 