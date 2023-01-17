"use strict";
module.exports = function(sequelize, DataTypes) {
  const Draw = sequelize.define(
    "Draw",
    {
      user_id: {
        type: DataTypes.FLOAT,
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
        allowNull: false
      },
      info: {
        type: DataTypes.STRING,
        allowNull: false
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false
      },
      classify: {
        type: DataTypes.STRING,
        allowNull: false
      }
    },
    {
      freezeTableName: true,
      tableName: "Draw",
      timestamps: false,
      underscored: true
    }
  );
  return Draw;
};
