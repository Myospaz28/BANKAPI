import React from 'react';
import { Row, Col, Card, Table, Badge } from 'react-bootstrap';

export default function WalletPage() {
  const walletList = [
    {
      bank: 'Bank 1',
      accountNo: 'XXXX-1234',
      balance: 125000,
      status: 'Active',
    },
    {
      bank: 'Bank 2',
      accountNo: 'XXXX-5678',
      balance: 8200,
      status: 'Low Balance',
    },
    {
      bank: 'Bank 3',
      accountNo: 'XXXX-9012',
      balance: 0,
      status: 'Blocked',
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return 'success';
      case 'Low Balance':
        return 'warning';
      case 'Blocked':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  return (
    <Row className="mb-4">
      {/* ===== Light Striped Table ===== */}
      <Col md={6} className="mb-3">
        <Card body>
          <Card.Title>Wallet Management</Card.Title>
          <Card.Subtitle className="mb-3 text-muted">
            View linked bank wallets and balances
          </Card.Subtitle>

          <Table responsive striped className="text-center">
            <thead>
              <tr>
                <th>#</th>
                <th>Bank</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {walletList.map((wallet, index) => (
                <tr key={index}>
                  <th scope="row">{index + 1}</th>

                  <td>{wallet.bank}</td>

                  <td>
                    ₹ {wallet.balance.toLocaleString('en-IN')}
                  </td>

                  <td>
                    <span className={`badge bg-${getStatusBadge(wallet.status)}`}>
                      {wallet.status}
                    </span>
                  </td>

                  <td>
                    <span className="cursor-pointer text-success me-2">
                      <i className="nav-icon i-Add font-weight-bold" />
                    </span>
                    <span className="cursor-pointer text-primary me-2">
                      <i className="nav-icon i-Money-Bag font-weight-bold" />
                    </span>
                    <span className="cursor-pointer text-danger">
                      <i className="nav-icon i-Eye font-weight-bold" />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </Col>

    </Row>
  );
}
