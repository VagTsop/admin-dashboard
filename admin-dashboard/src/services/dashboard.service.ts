import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { interval, map, Observable, startWith, switchMap } from 'rxjs';

@Injectable()
export class DashboardService {
  constructor(private http: HttpClient) {}

  private fetchData(path: string) {
    return this.http.get<any>(`assets/data/${path}.json`);
  }

  fetchNodesDonutChartData(): Observable<any[]> {
    return interval(3000).pipe(
      startWith(0),
      switchMap(() => this.fetchData('nodesDonutChartData')),
      map((data) =>
        data.map((item: { rate: number }) => ({
          ...item,
          rate: this.random(item.rate - 5, item.rate + 5),
        }))
      )
    );
  }

  fetchBeneficiariesDonutChartData(): Observable<any[]> {
    return interval(4000).pipe(
      startWith(0),
      switchMap(() => this.fetchData('beneficiariesDonutChartData')),
      map((data) =>
        data.map((item: { rate: number }) => ({
          ...item,
          rate: this.random(item.rate - 5, item.rate + 5),
        }))
      )
    );
  }

  fetchUsersDonutChartData(): Observable<any[]> {
    return interval(5000).pipe(
      startWith(0),
      switchMap(() => this.fetchData('usersDonutChartData')),
      map((data) =>
        data.map((item: { rate: number }) => ({
          ...item,
          rate: this.random(item.rate - 5, item.rate + 5),
        }))
      )
    );
  }

  fetchConversationContractsDonutChartData(): Observable<any[]> {
    return interval(4500).pipe(
      startWith(0),
      switchMap(() => this.fetchData('conversationContractsDonutChartData')),
      map((data) =>
        data.map((item: { rate: number }) => ({
          ...item,
          rate: this.random(item.rate - 5, item.rate + 5),
        }))
      )
    );
  }

  fetchCollaborationsDonutChartData(): Observable<any[]> {
    return interval(5000).pipe(
      startWith(0),
      switchMap(() => this.fetchData('collaborationsDonutChartData')),
      map((data) =>
        data.map((item: { rate: number }) => ({
          ...item,
          rate: this.random(item.rate - 5, item.rate + 5),
        }))
      )
    );
  }

  fetchCollaborationEnrollementsDonutChartData(): Observable<any[]> {
    return interval(4800).pipe(
      startWith(0),
      switchMap(() =>
        this.fetchData('collaborationEnrollementsDonutChartData')
      ),
      map((data) =>
        data.map((item: { rate: number }) => ({
          ...item,
          rate: this.random(item.rate - 5, item.rate + 5),
        }))
      )
    );
  }

  fetchNodesBeneficiariesUsersClusteredColumnChartData(): Observable<any[]> {
    return interval(5000).pipe(
      startWith(0),
      switchMap(() =>
        this.fetchData('nodesBeneficiariesUsersClusteredColumnChartData')
      ),
      map((data: any[]) =>
        data.map(
          (item: {
            active: number;
            deactivated: number;
            terminated: number;
            pending: number;
          }) => ({
            ...item,
            active: item.active + this.random(-3, 3),
            deactivated: item.deactivated + this.random(-3, 3),
            terminated: item.terminated + this.random(-3, 3),
            pending: item.pending + this.random(-3, 3),
          })
        )
      )
    );
  }

  fetchBeneficiariesClusteredColumnChartData(): Observable<any[]> {
    return interval(5000).pipe(
      startWith(0),
      switchMap(() => this.fetchData('beneficiariesClusteredColumnChartData')),
      map((data: any[]) =>
        data.map(
          (item: {
            licencee: number;
            partner: number;
            hosted: number;
            notApplied: number;
          }) => ({
            ...item,
            licencee: item.licencee + this.random(-5, 5),
            partner: item.partner + this.random(-5, 5),
            hosted: item.hosted + this.random(-5, 5),
            notApplied: item.notApplied + this.random(-5, 5),
          })
        )
      )
    );
  }
  fetchSubscriptionPoliciesPieChartData(): Observable<any[]> {
    return interval(5000).pipe(
      startWith(0),
      switchMap(() => this.fetchData('subscriptionPoliciesPieChartData')),
      map((data) =>
        data.map((item: { litres: number }) => ({
          ...item,
          litres: this.random(item.litres - 20, item.litres + 20),
        }))
      )
    );
  }

  fetchGroupsClusteredColumnChartData(): Observable<any[]> {
    return interval(5000).pipe(
      startWith(0),
      switchMap(() => this.fetchData('groupsClusteredColumnChartData')),
      map((data) =>
        data.map((item: { accessibleApps: number; groupMembers: number }) => ({
          ...item,
          accessibleApps: item.accessibleApps + this.random(-5, 5),
          groupMembers: item.groupMembers + this.random(-5, 5),
        }))
      )
    );
  }

  fetchShipmentOrdersInboundData(): Observable<any[]> {
    return interval(5000).pipe(
      startWith(0),
      switchMap(() => this.fetchData('shipmentOrdersInboundStockChartData')),
      map((data) =>
        data.map((item: { price: number; quantity: number }) => ({
          ...item,
          price: this.random(item.price - 30, item.price + 30),
          quantity: this.random(item.quantity - 100, item.quantity + 100),
        }))
      )
    );
  }

  fetchShipmentOrdersOutboundData(): Observable<any[]> {
    return interval(5000).pipe(
      startWith(0),
      switchMap(() => this.fetchData('shipmentOrdersOutboundStockChartData')),
      map((data) =>
        data.map((item: { price: number; quantity: number }) => ({
          ...item,
          price: this.random(item.price - 30, item.price + 30),
          quantity: this.random(item.quantity - 100, item.quantity + 100),
        }))
      )
    );
  }

  fetchMessagesIncomingStockChartData(): Observable<any[]> {
    return interval(5000).pipe(
      startWith(0),
      switchMap(() => this.fetchData('messagesIncomingStockChartData')),
      map((data) =>
        data.map((item: { price: number; quantity: number }) => ({
          ...item,
          price: this.random(item.price - 20, item.price + 20),
          quantity: this.random(item.quantity - 80, item.quantity + 80),
        }))
      )
    );
  }

  fetchMessagesOutcomingStockChartData(): Observable<any[]> {
    return interval(5000).pipe(
      startWith(0),
      switchMap(() => this.fetchData('messagesOutcomingStockChartData')),
      map((data) =>
        data.map((item: { price: number; quantity: number }) => ({
          ...item,
          price: this.random(item.price - 20, item.price + 20),
          quantity: this.random(item.quantity - 80, item.quantity + 80),
        }))
      )
    );
  }

  fetchNodesBeneficiariesUsers(): Observable<any[]> {
    return this.fetchLineGraphData(
      'nodesBeneficiariesUsersLineGraphChartData',
      ['node', 'beneficiary', 'user']
    );
  }

  fetchDeployedProcesses(): Observable<any[]> {
    return this.fetchLineGraphData('deployedProcessesLineGraphChartData', [
      'deployedProcesses',
    ]);
  }

  fetchReports(): Observable<any[]> {
    return this.fetchLineGraphData('reportsLineGraphChartData', ['reports']);
  }

  fetchPayments(): Observable<any[]> {
    return this.fetchLineGraphData('paymentsLineGraphChartData', ['payments']);
  }

  fetchAssignedProcesses(): Observable<any[]> {
    return this.fetchLineGraphData('assignedProcessesLineGraphChartData', [
      'beneficiary1',
      'beneficiary2',
      'beneficiary3',
      'beneficiary4',
    ]);
  }

  fetchProcessInstances(): Observable<any[]> {
    return this.fetchLineGraphData('processInstancesLineGraphChartData', [
      'processInstances',
    ]);
  }

  fetchUserRegistrationRequests(): Observable<any[]> {
    return this.fetchLineGraphData(
      'userRegistrationRequestsLineGraphChartData',
      ['userRegistrationRequests']
    );
  }

  fetchInterfaces(): Observable<any[]> {
    return this.fetchSparklineData('interfacesSparkLineChartData');
  }

  fetchInteractions(): Observable<any[]> {
    return this.fetchSparklineData('interactionsSparkLineChartData');
  }

  fetchAttestations(): Observable<any[]> {
    return this.fetchSparklineData('attestationsSparkLineChartData');
  }

  private fetchLineGraphData(
    path: string,
    fields: string[]
  ): Observable<any[]> {
    return interval(5000).pipe(
      startWith(0),
      switchMap(() => this.fetchData(path)),
      map((data: any[]) =>
        data.map((item) => {
          const mutated = { ...item };
          fields.forEach((field) => {
            if (item[field] !== undefined) {
              mutated[field] = this.random(item[field] - 10, item[field] + 10);
            }
          });
          return mutated;
        })
      )
    );
  }

  private fetchSparklineData(path: string): Observable<any[]> {
    return interval(5000).pipe(
      startWith(0),
      switchMap(() => this.fetchData(path)),
      map((data: any[]) =>
        data.map((item) => ({
          ...item,
          value: this.random(item.value - 5, item.value + 5),
        }))
      )
    );
  }

  private random(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
