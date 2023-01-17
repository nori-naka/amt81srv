"use strict";
module.exports = function(sequelize, DataTypes) {
  const Memo = sequelize.define(
    "Memo",
    {
      user_id: {
        type: DataTypes.STRING,
        primaryKey: true
      },
      id: {
        type: DataTypes.STRING,
        primaryKey: true
      },
      gid: {
        type: DataTypes.FLOAT,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      lat: {
        type: DataTypes.FLOAT,
        allowNull: false
      },
      lng: {
        type: DataTypes.FLOAT,
        allowNull: false
      },
      date: {
        type: DataTypes.DATE,
        allowNull: false
      },
      kind: {
        type: DataTypes.STRING,
        allowNull: true
      },
      info: {
        type: DataTypes.STRING,
        allowNull: true
      },
      status: {
        type: DataTypes.STRING,
        allowNull: true
      },
      classify: {
        type: DataTypes.STRING,
        allowNull: true
      },
      display_flag: {
        type: DataTypes.STRING,
        allowNull: false
      }
    },
    {
      freezeTableName: true,
      tableName: "Memo",
      timestamps: false,
      underscored: true
    }
  );
  return Memo;
};
