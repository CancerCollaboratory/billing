/*
 * Copyright 2016(c) The Ontario Institute for Cancer Research. All rights reserved.
 *
 * This program and the accompanying materials are made available under the terms of the GNU Public
 * License v3.0. You should have received a copy of the GNU General Public License along with this
 * program. If not, see <http://www.gnu.org/licenses/>.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 * FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY
 * WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
import React, { Component } from 'react';

import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import {fetchHeaders} from '~/utils';

import 'react-bootstrap-table/dist/react-bootstrap-table.min.css';
import './Invoices.scss';


export default 
class extends Component {
  state = { invoices: [] }

  getInvoices = async () => {
    const invoices = await this.fetchInvoices();
    this.setState({ invoices })
  }

  fetchInvoices = async () => {
    const response = await fetch('/api/invoice/getAllInvoices', {
      method: 'GET',
      headers: fetchHeaders.get(),
    });

    const data = await response.json();
    return data;
  }

  setEmailLink = (cell, row) => (
    <span className="glyphicon glyphicon-envelope" onClick={() => this.sendEmail(1)}></span>
  );

  sendEmail = (invoice) => {
    console.error('In Send Email');
    console.error(invoice);
    fetch('/api/invoice/email', {
      method: 'POST',
      headers: fetchHeaders.get(),
      data: {
        invoice
      }
    });
  }

  async componentDidMount() {
    this.getInvoices();
  }

  render () {
    return (
      <div className={`Invoices`}>
        <div>
          <h1 className="page-heading">
            Invoices
          </h1>
        </div>
        <BootstrapTable
            data={this.state.invoices}
            striped={true}
            condensed={true}
            search={true}
            exportCSV={true}
            hover={true}
            pagination={false}
            ignoreSinglePage
            keyField="key"
            options={{
              hideSizePerPage: true,
              sizePerPage: 10,
              sizePerPageList: [10, 50, 100]
            }}
            >
            <TableHeaderColumn
              dataField="current_organization"
              dataSort={true}
            >Project</TableHeaderColumn>
            <TableHeaderColumn
                dataField="date"
                dataSort={true}
            >Date</TableHeaderColumn>
            <TableHeaderColumn
                dataField="invoice_number"
                dataSort={true}
            >Invoice Number</TableHeaderColumn>
            <TableHeaderColumn
                dataField="payment_status"
                dataSort={true}
            >Payment Status</TableHeaderColumn>
            <TableHeaderColumn
                dataField="invoice_status"
                dataSort={true}
            >Invoice Status</TableHeaderColumn>
            <TableHeaderColumn
              dataField="cpu_cost"
              dataSort={true}
            >CPU Cost</TableHeaderColumn>
            <TableHeaderColumn
              dataField="image_cost"
              dataSort={true}
            >Image Cost</TableHeaderColumn>
            <TableHeaderColumn
              dataField="volume_cost"
              dataSort={true}
            >Volume Cost</TableHeaderColumn>
            <TableHeaderColumn
              dataField="discount"
              dataSort={true}
            >Discount%</TableHeaderColumn>
            <TableHeaderColumn
              dataField="total"
              dataSort={true}
            >Total Cost</TableHeaderColumn>
            <TableHeaderColumn
              dataAlign="center"
              dataField="email"
              dataFormat={this.setEmailLink}
            >Email</TableHeaderColumn>
          </BootstrapTable>
      </div>
    );
  }
}